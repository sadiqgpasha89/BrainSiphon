"""Allow-listed command checks for cloud and cluster permissions (aws, az, gcloud, kubectl, helm, terraform, docker, openssl)."""
from __future__ import annotations

import json
import shutil
import subprocess
from typing import Any, Dict, List

from ..model import CheckResult, Context, FAIL, PASS, SKIP, WARN

ALLOWED = {"aws", "az", "gcloud", "kubectl", "helm", "terraform", "docker", "openssl", "oc", "skopeo", "crane"}


def _dig(doc: Any, path: str) -> Any:
    for part in path.split("."):
        if isinstance(doc, list):
            doc = doc[int(part)]
        else:
            doc = doc.get(part)
        if doc is None:
            return None
    return doc


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    name, argv = item["name"], item["command"]
    base = dict(id=f"cmd.{name}", name=f"Command: {name}", category="cloud_access", target=" ".join(argv), owner_hint=item.get("owner", "Customer cloud / platform team"))
    severity = item.get("severity", "blocking")
    if not isinstance(argv, list) or argv[0] not in ALLOWED:
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"'{argv[0] if argv else ''}' is not on the allow-list ({', '.join(sorted(ALLOWED))})")]
    if not shutil.which(argv[0]):
        return [CheckResult(**base, status=SKIP, severity="advisory", message=f"{argv[0]} is not installed on this host", remediation="Install the CLI from the customer's internal mirror, or run this check from a host that has it.")]
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=float(item.get("timeout", 20)), check=False)
    except subprocess.TimeoutExpired:
        return [CheckResult(**base, status=FAIL, severity=severity, message="command timed out", remediation="The control plane is not reachable from this host: check the private endpoint and proxy.")]
    if p.returncode != 0:
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"exit code {p.returncode}: {(p.stderr or p.stdout).strip()[:200]}", remediation=item.get("remediation", "Check that this identity is logged in and holds the role the solution needs."))]
    details: Dict[str, Any] = {}
    for path, want in (item.get("expect_json") or {}).items():
        try:
            got = _dig(json.loads(p.stdout), path)
        except Exception:  # noqa: BLE001
            got = None
        details[path] = got
        if got != want:
            return [CheckResult(**base, status=FAIL, severity=severity, message=f"{path} is {got!r}, expected {want!r}", details=details)]
    if item.get("expect_contains") and item["expect_contains"] not in p.stdout:
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"output does not contain '{item['expect_contains']}'")]
    return [CheckResult(**base, status=PASS, severity=severity, message="ok", details=details)]
