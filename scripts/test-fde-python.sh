#!/usr/bin/env bash
# Runs every FDE Python suite: the pre-flight toolkit, the adapters and mocks, the evidence tools, and the ten use-case packs.
# Standard library plus pytest only. Usage: bash scripts/test-fde-python.sh   (or: npm run test:fde)
set -u
cd "$(dirname "$0")/.."
status=0
dirs=(fde-toolkit fde-adapters fde-evidence)
while IFS= read -r d; do dirs+=("$d"); done < <(find fde-packs -mindepth 2 -maxdepth 2 -type d | sort)
for d in "${dirs[@]}"; do
  [ -d "$d/tests" ] || continue
  out=$(cd "$d" && python3 -m pytest tests -q 2>&1); rc=$?
  printf '%-62s %s\n' "$d" "$(printf '%s' "$out" | tail -1)"
  if [ $rc -ne 0 ]; then status=1; printf '%s\n' "$out" | tail -25; fi
done
exit $status
