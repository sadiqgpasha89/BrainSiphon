"""Report writers: JSON (machine-readable), Markdown (for the customer's change record) and JUnit XML (for a CI gate)."""
from __future__ import annotations

import json
import xml.sax.saxutils as sx
from typing import Any, Dict

ICON = {"pass": "PASS", "fail": "FAIL", "warn": "WARN", "skip": "SKIP"}


def to_json(report: Dict[str, Any]) -> str:
    return json.dumps(report, indent=2, sort_keys=False) + "\n"


def to_markdown(report: Dict[str, Any]) -> str:
    s = report["summary"]
    L = [f"# Environment readiness: {report.get('customer') or 'customer'} / {report.get('environment') or 'environment'}", "",
         f"**Verdict: {s['readiness']}**  ·  {s['passed']} passed, {s['failed']} failed, {s['warnings']} warnings, {s['skipped']} skipped of {s['total']}", "",
         f"Generated {report['generated_at']} by bs-preflight {report['tool']['version']} on {report['run']['host']} (offline: {report['run']['offline']}).", ""]
    if s["blocking_failures"]:
        L += ["## Blocking failures", ""]
        for c in report["checks"]:
            if c["id"] in s["blocking_failures"]:
                L += [f"- **{c['name']}** (`{c['target']}`): {c['message']}", f"  - Fix: {c['remediation'] or 'see details'}", f"  - Owner: {c['owner_hint'] or 'n/a'}"]
        L.append("")
    L += ["## All checks", "", "| Status | Check | Target | Result |", "|---|---|---|---|"]
    for c in report["checks"]:
        L.append(f"| {ICON[c['status']]} | {c['name']} | `{c['target']}` | {c['message'].replace('|', '/')} |")
    return "\n".join(L) + "\n"


def to_junit(report: Dict[str, Any]) -> str:
    s = report["summary"]
    cases = []
    for c in report["checks"]:
        body = ""
        if c["status"] == "fail":
            body = f'<failure message={sx.quoteattr(c["message"])}>{sx.escape(c["remediation"])}</failure>'
        elif c["status"] == "skip":
            body = f'<skipped message={sx.quoteattr(c["message"])}/>'
        cases.append(f'<testcase classname={sx.quoteattr(c["category"])} name={sx.quoteattr(c["name"])} time="{c["duration_ms"] / 1000:.3f}">{body}</testcase>')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<testsuite name="bs-preflight" tests="{s["total"]}" failures="{s["failed"]}" skipped="{s["skipped"]}">\n  ' + "\n  ".join(cases) + "\n</testsuite>\n")
