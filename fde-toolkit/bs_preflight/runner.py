"""Runs the configured checks in a fixed order (authentication before the checks that reuse its token) and builds the report."""
from __future__ import annotations

import datetime as dt
import getpass
import platform
import socket
import time
from typing import Any, Callable, Dict, List

from . import REPORT_SCHEMA_VERSION, __version__
from .checks import cmd, database, dns, egress, http, idp, kafka, object_storage, proxy, service_account, tcp, tls
from .model import CheckResult, Context, FAIL, SKIP, verdict

#: (config section, function, needs internet unless the destination is private)
ORDER: List[Any] = [
    ("proxy_checks", proxy.run),
    ("dns", dns.run),
    ("tcp", tcp.run),
    ("tls", tls.run),
    ("http", http.run_http),
    ("api_auth", http.run_api_auth),
    ("idp", idp.run),
    ("service_accounts", service_account.run),
    ("databases", database.run),
    ("kafka", kafka.run),
    ("object_storage", object_storage.run),
    ("cloud_access", cmd.run),
    ("egress_denied", egress.run),
]


def build_context(cfg: Dict[str, Any], args_timeout: float = 0.0, offline: bool = False) -> Context:
    return Context(timeout=args_timeout or float(cfg.get("timeout", 5)), offline=offline or bool(cfg.get("offline")),
                   proxy=cfg.get("proxy", {}) or {}, ca_file=cfg.get("ca_file"))


def run_all(cfg: Dict[str, Any], ctx: Context, only: List[str] = (), progress: Callable[[CheckResult], None] = lambda r: None) -> List[CheckResult]:
    results: List[CheckResult] = []
    for section, fn in ORDER:
        if only and section not in only:
            continue
        items = cfg.get(section, [])
        if section == "proxy_checks" and not items and (cfg.get("proxy") or {}):
            items = [{}]
        for item in items:
            t0 = time.monotonic()
            if ctx.offline and item.get("requires_internet"):
                r = [CheckResult(id=f"{section}.{item.get('name', item.get('host', ''))}", name=str(item.get("name", section)), category=section, status=SKIP, severity="advisory", message="skipped: offline mode and this check needs the internet")]
            else:
                try:
                    r = fn(item, ctx)
                except Exception as e:  # noqa: BLE001 - a crashing check must not hide the rest of the report
                    r = [CheckResult(id=f"{section}.{item.get('name', '')}", name=str(item.get("name", section)), category=section, status=FAIL, message=f"check crashed: {type(e).__name__}: {e}", remediation="This is a defect in the check or its configuration, not in the environment.")]
            ms = int((time.monotonic() - t0) * 1000)
            for x in r:
                if not x.duration_ms:
                    x.duration_ms = ms // max(1, len(r))
                results.append(x)
                progress(x)
    return results


def build_report(cfg: Dict[str, Any], ctx: Context, results: List[CheckResult]) -> Dict[str, Any]:
    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "tool": {"name": "bs-preflight", "version": __version__},
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "customer": cfg.get("customer", ""),
        "environment": cfg.get("environment", ""),
        "use_case": cfg.get("use_case", ""),
        "run": {"host": socket.gethostname(), "user": _user(), "python": platform.python_version(), "os": f"{platform.system()} {platform.release()}",
                "offline": ctx.offline, "proxy_configured": bool(ctx.proxy), "timeout_seconds": ctx.timeout},
        "summary": verdict(results),
        "checks": [r.to_dict() for r in results],
    }


def _user() -> str:
    try:
        return getpass.getuser()
    except Exception:  # noqa: BLE001
        return ""
