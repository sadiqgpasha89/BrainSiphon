"""python3 -m fde_adapters list | mock <system> | check --config FILE [--mock] | contract --config FILE --mock"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Any, Dict, Optional

from .core import registry
from .core.config import load as load_config
from .mocks import vendors
from .testing import run_contract_suite

#: adapter id -> (mock factory, connection key that holds the base URL)
HTTP_MOCKS: Dict[str, Any] = {
    "salesforce": (vendors.salesforce, "instance_url"),
    "servicenow": (vendors.servicenow, "instance_url"),
    "dynamics365": (vendors.dynamics, "org_url"),
    "sap-odata": (vendors.sap, "base_url"),
    "snowflake": (vendors.snowflake, "account_url"),
    "databricks": (vendors.databricks, "workspace_url"),
    "s3": (vendors.s3, "endpoint"),
}


def _dummy_env(node: Any) -> None:
    if isinstance(node, dict):
        for k, v in node.items():
            if k.endswith("_env") and isinstance(v, str) and not os.environ.get(v):
                os.environ[v] = "mock-" + v.lower()
            _dummy_env(v)
    elif isinstance(node, list):
        for v in node:
            _dummy_env(v)


def _prepare_mock(cfg: Dict[str, Any]):
    """Point a configuration at a local mock of the same system. Returns (config, server or None)."""
    aid = cfg["adapter"]
    cfg = json.loads(json.dumps(cfg))
    _dummy_env(cfg)
    srv = None
    if aid in HTTP_MOCKS:
        factory, key = HTTP_MOCKS[aid]
        srv = factory()
        cfg["connection"][key] = srv.base
        a = cfg["connection"].get("auth", {})
        if "token_url" in a:
            a["token_url"] = srv.base + "/token"
        if a.get("type") == "jwt_bearer" and shutil.which("openssl"):
            d = tempfile.mkdtemp()
            k = os.path.join(d, "mock.pem")
            subprocess.run(["openssl", "genrsa", "-out", k, "2048"], check=True, capture_output=True)
            os.environ[a["private_key_path_env"]] = k
        if aid == "snowflake":
            cfg["connection"]["auth"] = {"type": "bearer", "token_env": a.get("token_env", "SNOWFLAKE_JWT")}
        if aid == "s3":
            cfg["connection"]["bucket"] = "forecasts"
            cfg["connection"]["path_style"] = True
    elif aid in ("kafka", "rabbitmq", "postgres", "sqlserver", "oracle"):
        cfg["connection"]["mock"] = True
    return cfg, srv


def main(argv: Optional[list] = None) -> int:
    p = argparse.ArgumentParser(prog="fde_adapters", description="BrainSiphon FDE adapter framework")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list", help="list the adapters, their protocol and what their mock reproduces")
    m = sub.add_parser("mock", help="serve a vendor-shaped mock until interrupted")
    m.add_argument("system", choices=sorted(HTTP_MOCKS))
    c = sub.add_parser("check", help="health-check an adapter and read a few records")
    c.add_argument("--config", required=True)
    c.add_argument("--mock", action="store_true", help="run against a local mock of the system instead of the real one")
    c.add_argument("--limit", type=int, default=3)
    t = sub.add_parser("contract", help="run the standard contract battery against the mock")
    t.add_argument("--config", required=True)
    args = p.parse_args(argv)
    if args.cmd == "list":
        for a in registry.catalogue():
            print(f"{a['id']:14} {a['title']}\n{'':14} protocol: {a['protocol']}\n{'':14} mock: {a['mock']}\n")
        return 0
    if args.cmd == "mock":
        srv = HTTP_MOCKS[args.system][0]()
        print(f"{args.system} mock listening on {srv.base}\nPress Ctrl-C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            srv.close()
        return 0
    cfg = load_config(args.config)
    srv = None
    if args.cmd == "contract" or getattr(args, "mock", False):
        cfg, srv = _prepare_mock(cfg)
    cfg.setdefault("retry", {"max_attempts": 3, "base_delay": 0.0, "max_delay": 0.0})
    try:
        if args.cmd == "check":
            ad = registry.build(cfg)
            h = ad.healthcheck()
            recs = [r.payload for r in ad.read(limit=args.limit)] if h.ok else []
            print(json.dumps({"adapter": cfg["adapter"], "healthy": h.ok, "health": h.checks, "message": h.message, "sample_records": recs, "metrics": ad.metrics}, indent=2, default=str))
            return 0 if h.ok else 1
        if srv is None:
            print("contract tests need a mock: this adapter has no HTTP mock (run its pytest suite instead)", file=sys.stderr)
            return 2
        res = run_contract_suite(lambda: registry.build(cfg), srv, expect_min_records=1, sample_write=None)
        for n, ok, d in res:
            print(("PASS " if ok else "FAIL ") + n + (f" ({d})" if d and not ok else ""))
        return 0 if all(ok for _, ok, _ in res) else 1
    finally:
        if srv:
            srv.close()


if __name__ == "__main__":
    sys.exit(main())
