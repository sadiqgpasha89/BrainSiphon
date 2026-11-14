#!/usr/bin/env bash
# bs-preflight, shell edition. For jump hosts that have no Python at all.
# Needs: bash, and (when the matching check is used) getent or dig, timeout, openssl, curl.
# Writes a readiness report with the same top-level fields and verdict rules as the Python tool (schema/readiness-report.schema.json).
#
# usage: preflight.sh targets.tsv [readiness-report.json]
# targets.tsv, tab separated, '#' starts a comment:
#   dns          name   host
#   tcp          name   host   port
#   tls          name   host   port   min_days_valid(optional, default 21)
#   http         name   url    expected_status(optional, default 200)
#   egress_denied name  host   port
set -u
TARGETS="${1:?usage: preflight.sh targets.tsv [report.json]}"
OUT="${2:-readiness-report.json}"
TIMEOUT="${BS_TIMEOUT:-5}"
CUSTOMER="${BS_CUSTOMER:-}"
ENVIRONMENT="${BS_ENVIRONMENT:-}"

json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e ':a;N;$!ba;s/\n/\\n/g' -e 's/\t/\\t/g'; }

ROWS=(); PASS=0; FAIL=0; WARN=0; SKIP=0; BLOCK=(); ADV=()
add() { # id name category status target message remediation owner severity
  local id="$1" name="$2" cat="$3" st="$4" target="$5" msg="$6" fix="$7" owner="$8" sev="${9:-blocking}"
  case "$st" in
    pass) PASS=$((PASS+1));;
    fail) FAIL=$((FAIL+1)); if [ "$sev" = blocking ]; then BLOCK+=("\"$(json_escape "$id")\""); else ADV+=("\"$(json_escape "$id")\""); fi;;
    warn) WARN=$((WARN+1)); ADV+=("\"$(json_escape "$id")\"");;
    skip) SKIP=$((SKIP+1));;
  esac
  ROWS+=("{\"id\":\"$(json_escape "$id")\",\"name\":\"$(json_escape "$name")\",\"category\":\"$cat\",\"status\":\"$st\",\"severity\":\"$sev\",\"target\":\"$(json_escape "$target")\",\"message\":\"$(json_escape "$msg")\",\"details\":{},\"remediation\":\"$(json_escape "$fix")\",\"owner_hint\":\"$(json_escape "$owner")\",\"duration_ms\":0}")
  printf '  %-4s %s: %s\n' "$st" "$name" "$msg"
}

tcp_open() { timeout "$TIMEOUT" bash -c "exec 3<>/dev/tcp/$1/$2" 2>/dev/null; }

check_dns() {
  local out
  if command -v getent >/dev/null; then out="$(getent ahosts "$2" 2>/dev/null | awk '{print $1}' | sort -u | paste -sd, -)"
  elif command -v dig >/dev/null; then out="$(dig +short +time=3 +tries=1 "$2" | paste -sd, -)"
  else add "dns.$1" "DNS: $1" dns skip "$2" "neither getent nor dig is installed" "" "" advisory; return; fi
  if [ -n "$out" ]; then add "dns.$1" "DNS: $1" dns pass "$2" "$2 resolves to $out" "" "Customer network / DNS team"
  else add "dns.$1" "DNS: $1" dns fail "$2" "$2 did not resolve" "Check the resolver, the private DNS zone link and the spelling of the host name." "Customer network / DNS team"; fi
}
check_tcp() {
  if tcp_open "$2" "$3"; then add "tcp.$1" "TCP: $1" network pass "$2:$3" "connected to $2:$3" "" "Customer network / firewall team"
  else add "tcp.$1" "TCP: $1" network fail "$2:$3" "cannot reach $2:$3 (timeout or refused)" "A timeout usually means a firewall drop, a refusal means nothing is listening. Request the rule from the network team." "Customer network / firewall team"; fi
}
check_tls() {
  local name="$1" host="$2" port="$3" min="${4:-21}" pem end days
  command -v openssl >/dev/null || { add "tls.$name" "TLS: $name" tls skip "$host:$port" "openssl is not installed" "" "" advisory; return; }
  pem="$(echo | timeout "$TIMEOUT" openssl s_client -connect "$host:$port" -servername "$host" 2>/dev/null)"
  if [ -z "$pem" ] || ! printf '%s' "$pem" | grep -q 'BEGIN CERTIFICATE'; then
    add "tls.$name" "TLS: $name" tls fail "$host:$port" "no certificate returned (handshake failed or port closed)" "Check the minimum TLS version, mTLS requirements and that the port speaks TLS." "Customer PKI / platform team"; return; fi
  end="$(printf '%s' "$pem" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  if printf '%s' "$pem" | grep -q 'Verify return code: 0'; then add "tls.$name" "TLS: $name" tls pass "$host:$port" "chain verified" "" "Customer PKI / platform team"
  else add "tls.$name" "TLS: $name" tls fail "$host:$port" "chain did not verify: $(printf '%s' "$pem" | grep 'Verify return code' | head -1)" "Install the customer's CA bundle or ask for the full chain to be served." "Customer PKI / platform team"; fi
  days=$(( ( $(date -d "$end" +%s 2>/dev/null || echo 0) - $(date +%s) ) / 86400 ))
  if [ "$days" -lt 0 ]; then add "tls.$name.expiry" "TLS expiry: $name" tls fail "$host:$port" "certificate expired $((-days)) day(s) ago" "Renew the certificate and check the rotation job." "Customer PKI / platform team"
  elif [ "$days" -lt "$min" ]; then add "tls.$name.expiry" "TLS expiry: $name" tls warn "$host:$port" "expires in $days day(s) (minimum $min)" "Schedule rotation before the expiry date." "Customer PKI / platform team" advisory
  else add "tls.$name.expiry" "TLS expiry: $name" tls pass "$host:$port" "$days day(s) until expiry" "" "Customer PKI / platform team"; fi
}
check_http() {
  local want="${3:-200}" code
  command -v curl >/dev/null || { add "http.$1" "HTTP: $1" http skip "$2" "curl is not installed" "" "" advisory; return; }
  code="$(curl -s -o /dev/null -m "$TIMEOUT" -w '%{http_code}' "$2" 2>/dev/null)"
  if [ "$code" = "$want" ]; then add "http.$1" "HTTP: $1" http pass "$2" "HTTP $code" "" "Customer platform team"
  else add "http.$1" "HTTP: $1" http fail "$2" "HTTP ${code:-000}, expected $want" "000 means no connection (network or proxy); 401 means identity; 403 means permission." "Customer platform team"; fi
}
check_egress() {
  if tcp_open "$2" "$3"; then add "egress.$2.$3" "Egress blocked: $2:$3" egress fail "$2:$3" "$2:$3 is reachable but must be blocked" "The environment is not isolated as designed. Confirm the egress policy with the customer's security team before loading data." "Customer network / security team"
  else add "egress.$2.$3" "Egress blocked: $2:$3" egress pass "$2:$3" "not reachable, as required" "" "Customer network / security team"; fi
}

echo "bs-preflight (shell) customer=${CUSTOMER:--} environment=${ENVIRONMENT:--}"
while IFS=$'\t' read -r kind name a b c || [ -n "${kind:-}" ]; do
  case "${kind:-}" in ''|'#'*) continue;; esac
  case "$kind" in
    dns) check_dns "$name" "$a";;
    tcp) check_tcp "$name" "$a" "$b";;
    tls) check_tls "$name" "$a" "$b" "${c:-21}";;
    http) check_http "$name" "$a" "$b";;
    egress_denied) check_egress "$name" "$a" "$b";;
    *) echo "unknown check type '$kind'" >&2; exit 2;;
  esac
done < "$TARGETS"

TOTAL=$((PASS+FAIL+WARN+SKIP))
if [ "${#BLOCK[@]}" -gt 0 ]; then STATE=NOT_READY; elif [ "${#ADV[@]}" -gt 0 ]; then STATE=READY_WITH_WARNINGS; else STATE=READY; fi
join() { local IFS=,; echo "$*"; }
{
  printf '{\n  "schema_version": "1.0",\n  "tool": {"name": "bs-preflight-shell", "version": "1.0.0"},\n'
  printf '  "generated_at": "%s",\n  "customer": "%s",\n  "environment": "%s",\n  "use_case": "",\n' "$(date -u +%Y-%m-%dT%H:%M:%S+00:00)" "$(json_escape "$CUSTOMER")" "$(json_escape "$ENVIRONMENT")"
  printf '  "run": {"host": "%s", "user": "%s", "python": "", "os": "%s", "offline": false, "proxy_configured": %s, "timeout_seconds": %s},\n' "$(hostname)" "$(id -un)" "$(uname -sr)" "$([ -n "${https_proxy:-${HTTPS_PROXY:-}}" ] && echo true || echo false)" "$TIMEOUT"
  printf '  "summary": {"readiness": "%s", "total": %s, "passed": %s, "failed": %s, "warnings": %s, "skipped": %s, "blocking_failures": [%s], "advisories": [%s]},\n' "$STATE" "$TOTAL" "$PASS" "$FAIL" "$WARN" "$SKIP" "$(join "${BLOCK[@]+"${BLOCK[@]}"}")" "$(join "${ADV[@]+"${ADV[@]}"}")"
  printf '  "checks": [\n    %s\n  ]\n}\n' "$(IFS=$',\n    '; echo "${ROWS[*]+"${ROWS[*]}"}")"
} > "$OUT"
echo; echo "$STATE: $PASS passed, $FAIL failed, $WARN warnings, $SKIP skipped. Report: $OUT"
[ "$STATE" = NOT_READY ] && exit 1
exit 0
