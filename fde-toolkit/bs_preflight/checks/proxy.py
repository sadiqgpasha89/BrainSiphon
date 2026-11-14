"""Proxy checks: is the proxy itself reachable, and does it allow CONNECT to the destinations the solution needs?"""
from __future__ import annotations

from typing import Any, Dict, List

from ..model import CheckResult, Context, FAIL, PASS, WARN
from ..netutil import ProxyError, classify_error, effective_proxy, no_proxy_matches, parse_proxy
import socket


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    proxy = item.get("proxy_url") or ctx.proxy.get("https_proxy") or ctx.proxy.get("http_proxy")
    base = dict(id="proxy.reachable", name="Corporate proxy", category="proxy", target=proxy or "", owner_hint="Customer network team")
    if not proxy:
        return [CheckResult(**base, status=WARN, severity="advisory", message="no proxy configured: a direct connection is assumed", remediation="If the customer network requires a proxy, set proxy.https_proxy in the configuration.")]
    host, port, _auth = parse_proxy(proxy)
    out: List[CheckResult] = []
    try:
        socket.create_connection((host, port), timeout=ctx.timeout).close()
        out.append(CheckResult(**base, status=PASS, message=f"proxy {host}:{port} is reachable"))
    except Exception as e:  # noqa: BLE001
        code, hint = classify_error(e)
        return [CheckResult(**base, status=FAIL, message=f"proxy not reachable ({code})", details={"error": str(e)}, remediation=hint)]
    from ..netutil import connect

    for d in item.get("connect_to", []):
        rb = dict(base, id=f"proxy.connect.{d['host']}.{d.get('port', 443)}", name=f"Proxy CONNECT {d['host']}:{d.get('port', 443)}", target=f"{d['host']}:{d.get('port', 443)}")
        try:
            connect(d["host"], int(d.get("port", 443)), ctx.timeout, {"https_proxy": proxy, "http_proxy": proxy}).close()
            out.append(CheckResult(**rb, status=PASS, message="CONNECT allowed"))
        except ProxyError as e:
            c, h = classify_error(e)
            out.append(CheckResult(**rb, status=FAIL, message=f"CONNECT refused: {e.line} ({c})", details={"status": e.status}, remediation=h))
        except Exception as e:  # noqa: BLE001
            c, h = classify_error(e)
            out.append(CheckResult(**rb, status=FAIL, message=f"CONNECT failed ({c})", details={"error": str(e)}, remediation=h))
    for h in item.get("expect_bypass", []):
        rb = dict(base, id=f"proxy.bypass.{h}", name=f"NO_PROXY covers {h}", target=h)
        covered = no_proxy_matches(h, ctx.proxy.get("no_proxy") or "")
        out.append(CheckResult(**rb, status=PASS if covered else WARN, severity="advisory", message="bypassed as intended" if covered else "traffic to this internal host would go through the proxy", remediation="" if covered else "Add the host or its CIDR to no_proxy, otherwise internal traffic hairpins through the proxy and may be blocked."))
    return out
