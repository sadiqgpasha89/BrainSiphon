"""TCP reachability for every port the firewall request lists, directly or through the corporate proxy."""
from __future__ import annotations

from typing import Any, Dict, List

from ..model import CheckResult, Context, FAIL, PASS, Timer
from ..netutil import classify_error, connect


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    host, port, name = item["host"], int(item["port"]), item["name"]
    base = dict(id=f"tcp.{name}", name=f"TCP: {name}", category="network", target=f"{host}:{port}",
                owner_hint=item.get("owner", "Customer network / firewall team"))
    severity = item.get("severity", "blocking")
    use_proxy = ctx.proxy if item.get("via_proxy") else {"no_proxy": "*"}
    with Timer() as t:
        try:
            s = connect(host, port, float(item.get("timeout", ctx.timeout)), use_proxy)
            s.close()
            return [CheckResult(**base, status=PASS, severity=severity, message=f"connected to {host}:{port}",
                                details={"purpose": item.get("purpose", ""), "via_proxy": bool(item.get("via_proxy"))}, duration_ms=0)]
        except Exception as e:  # noqa: BLE001
            code, hint = classify_error(e)
            return [CheckResult(**base, status=FAIL, severity=severity, message=f"cannot reach {host}:{port} ({code})",
                                details={"error": str(e), "reason": code, "purpose": item.get("purpose", "")}, remediation=hint)]
