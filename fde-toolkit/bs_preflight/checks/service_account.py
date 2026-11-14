"""Service-account permission validation: prove what an identity can do, and also what it must not be able to do."""
from __future__ import annotations

import urllib.error
from typing import Any, Dict, List

from ..model import CheckResult, Context, FAIL, PASS, SKIP, WARN
from ..netutil import classify_error
from .http import request


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    name = item["name"]
    base = dict(id=f"sa.{name}", name=f"Service account: {name}", category="service_account", target=item.get("base_url", ""), owner_hint=item.get("owner", "Customer security / IAM team"))
    severity = item.get("severity", "blocking")
    token = ctx.tokens.get(item.get("auth_ref", ""))
    if not token:
        return [CheckResult(**base, status=SKIP, severity="advisory", message=f"no token from api_auth check '{item.get('auth_ref')}' (it failed or is not configured)", remediation="Fix the authentication check first.")]
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    out: List[CheckResult] = []
    for label, paths, want_ok in (("allowed", item.get("expect_allow", []), True), ("denied", item.get("expect_deny", []), False)):
        for p in paths:
            method, _, path = p.partition(" ") if " " in p else ("GET", "", p)
            rb = dict(base, id=f"sa.{name}.{label}.{path}", name=f"{name} {label}: {method} {path}", target=item["base_url"] + path)
            try:
                st, _h, _b, _ = request(item["base_url"] + path, ctx, item, method, headers)
            except Exception as e:  # noqa: BLE001
                code, hint = classify_error(getattr(e, "reason", e) if isinstance(e, urllib.error.URLError) else e)
                out.append(CheckResult(**rb, status=FAIL, severity=severity, message=f"request failed ({code})", remediation=hint))
                continue
            if want_ok:
                ok = 200 <= st < 300
                out.append(CheckResult(**rb, status=PASS if ok else FAIL, severity=severity, message=f"HTTP {st}" + ("" if ok else " - the account lacks a permission the solution needs"), remediation="" if ok else "403 means authenticated but not authorised: request the missing role or scope. 404 can also be a hidden resource."))
            else:
                ok = st in (401, 403)
                out.append(CheckResult(**rb, status=PASS if ok else FAIL, severity=severity, message=f"HTTP {st}" + ("" if ok else " - the account can do something it must not (over-privileged)"), remediation="" if ok else "Remove the role or scope. Least privilege is a release criterion for the security sign-off."))
    return out
