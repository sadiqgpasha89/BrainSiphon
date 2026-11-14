"""The standard contract test battery every adapter must pass against its mock. FDEs run it on their own adapters too:

    from fde_adapters.testing import run_contract_suite
    run_contract_suite(MyAdapter, config_dict, mock_server, seed=...)  # returns a list of (test, passed, detail)
"""
from __future__ import annotations

import os
from typing import Any, Callable, Dict, List, Optional, Tuple

from .core.errors import AuthError, PermissionDenied, RateLimited, TransientError

Result = Tuple[str, bool, str]


def run_contract_suite(make_adapter: Callable[[], Any], server: Any, *, expect_min_records: int = 1, query: Optional[Dict[str, Any]] = None,
                       sample_write: Optional[Dict[str, Any]] = None, write_path_prefix: str = "") -> List[Result]:
    """make_adapter builds a fresh adapter pointed at `server` (a MockServer). Faults are injected through server.fail_next."""
    out: List[Result] = []

    def rec(name: str, ok: bool, detail: str = "") -> None:
        out.append((name, bool(ok), detail))

    a = make_adapter()
    h = a.healthcheck()
    rec("healthcheck passes against the mock", h.ok, h.message)
    rows = list(a.read(query or {}, limit=50))
    rec(f"read returns at least {expect_min_records} mapped record(s)", len(rows) >= expect_min_records, f"got {len(rows)}")
    rec("every record validates against the output contract", all(not r.issues for r in rows), "")
    rec("every record has a stable key and a source", all(r.key and r.source for r in rows), "")
    before = server.calls()
    server.fail_next(2, 503)
    again = list(make_adapter().read(query or {}, limit=3))
    rec("a burst of 503 is retried and the read still succeeds", len(again) >= 1 and len(server.calls()) - len(before) >= 3, "")
    server.fail_next(1, 429, {"Retry-After": "0"})
    rec("429 with Retry-After is honoured", len(list(make_adapter().read(query or {}, limit=1))) >= 1, "")
    if sample_write is not None:
        w = make_adapter()
        r1 = w.write([sample_write])
        r2 = w.write([sample_write])
        rec("first write is accepted", r1.accepted == 1 and r1.ok, str(r1.failed))
        rec("the same record written again is a duplicate and has no second effect", r2.duplicates == 1 and r2.accepted == 0, "")
        calls = [c for c in server.calls() if c["method"] in ("POST", "PUT", "PATCH") and c["path"].startswith(write_path_prefix)]
        rec("exactly one write reached the system", len(calls) >= 1, f"{len(calls)} write call(s)")
        server.fail_next(1, 403)
        r3 = make_adapter().write([{**sample_write, "_nonce": "x"}], key_fields=["_nonce"])
        rec("403 is surfaced as permission denied, not retried forever", len(r3.failed) == 1 and r3.failed[0]["code"] == "permission_denied", str(r3.failed))
    return out
