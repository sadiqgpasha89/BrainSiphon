"""Command line: python3 -m bs_preflight run --config preflight.json --out readiness-report.json"""
from __future__ import annotations

import argparse
import json
import sys
from typing import List, Optional

from . import __version__
from .config import ConfigError, SECTIONS, load
from .model import CheckResult
from .report import to_json, to_junit, to_markdown
from .runner import build_context, build_report, run_all

SYMBOL = {"pass": "✔", "fail": "✘", "warn": "!", "skip": "-"}


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(prog="bs-preflight", description="Enterprise environment readiness checks for a customer deployment.")
    p.add_argument("--version", action="version", version=__version__)
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="run the checks in a configuration file")
    r.add_argument("--config", required=True)
    r.add_argument("--out", default="readiness-report.json", help="machine-readable report (default readiness-report.json)")
    r.add_argument("--markdown", help="also write a Markdown report")
    r.add_argument("--junit", help="also write a JUnit XML report")
    r.add_argument("--only", action="append", default=[], choices=sorted(SECTIONS), help="run only these sections")
    r.add_argument("--timeout", type=float, default=0.0)
    r.add_argument("--offline", action="store_true", help="skip checks marked requires_internet; never contact public hosts")
    r.add_argument("--strict", action="store_true", help="exit 3 when the verdict is READY_WITH_WARNINGS")
    r.add_argument("--quiet", action="store_true")
    v = sub.add_parser("validate-config", help="check a configuration file without running anything")
    v.add_argument("--config", required=True)
    args = p.parse_args(argv)
    try:
        cfg = load(args.config)
    except ConfigError as e:
        print(f"configuration error: {e}", file=sys.stderr)
        return 2
    if args.cmd == "validate-config":
        n = sum(len(cfg.get(s, [])) for s in SECTIONS)
        print(f"{args.config}: valid, {n} check(s) configured")
        return 0
    ctx = build_context(cfg, args.timeout, args.offline)

    def show(res: CheckResult) -> None:
        if not args.quiet:
            print(f"  {SYMBOL[res.status]} {res.name}: {res.message}")

    if not args.quiet:
        print(f"bs-preflight {__version__}  customer={cfg.get('customer', '-')} environment={cfg.get('environment', '-')} offline={ctx.offline}")
    results = run_all(cfg, ctx, args.only, show)
    report = build_report(cfg, ctx, results)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(to_json(report))
    if args.markdown:
        with open(args.markdown, "w", encoding="utf-8") as f:
            f.write(to_markdown(report))
    if args.junit:
        with open(args.junit, "w", encoding="utf-8") as f:
            f.write(to_junit(report))
    s = report["summary"]
    if not args.quiet:
        print(f"\n{s['readiness']}: {s['passed']} passed, {s['failed']} failed, {s['warnings']} warnings, {s['skipped']} skipped. Report: {args.out}")
    if s["readiness"] == "NOT_READY":
        return 1
    if s["readiness"] == "READY_WITH_WARNINGS" and args.strict:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
