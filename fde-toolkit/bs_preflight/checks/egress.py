"""Air-gap proof: destinations that must NOT be reachable. A pass means the connection was blocked."""
from __future__ import annotations

import socket
from typing import Any, Dict, List

from ..model import CheckResult, Context, FAIL, PASS


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    host, port = item["host"], int(item.get("port", 443))
    base = dict(id=f"egress.{host}.{port}", name=f"Egress blocked: {host}:{port}", category="egress", target=f"{host}:{port}", owner_hint="Customer network / security team")
    try:
        s = socket.create_connection((host, port), timeout=float(item.get("timeout", min(ctx.timeout, 3.0))))
        s.close()
        return [CheckResult(**base, status=FAIL, severity=item.get("severity", "blocking"), message=f"{host}:{port} is reachable but must be blocked in this environment", remediation="The environment is not isolated as the design assumes. Confirm the egress policy with the customer's security team before any data is loaded.")]
    except (OSError, socket.timeout):
        return [CheckResult(**base, status=PASS, message=f"{host}:{port} is not reachable, as required")]
