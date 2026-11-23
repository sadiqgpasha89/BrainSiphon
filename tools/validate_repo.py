"""Check every worked template for completeness and consistency. Exits non-zero on any problem.

    python3 tools/validate_repo.py

For each of the 975 packs: every required file exists and is non-trivial; contracts parse; the manifest lists exactly the files on disk
with matching hashes; results.json exists and belongs to this pack; no placeholder text is left behind; the README names the right use
case. Across the repository: 975 packs (125 healthcare, 50 in each of the other 17 domains), no pack without a blueprint, no blueprint without a pack.
"""
from __future__ import annotations

import gzip
import hashlib
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = [
    "README.md", "WORKED_EXAMPLE.md", "FIT.md", "manifest.json",
    *[f"docs/{n}.md" for n in ("00-use-case-brief", "01-discovery-workbook", "02-delivery-plan", "03-data-and-features", "04-evaluation-plan", "05-risk-and-governance", "06-operations-runbook", "07-model-and-data-cards", "08-capacity-and-cost")],
    "contracts/openapi.yaml", "contracts/events.asyncapi.yaml", "contracts/data-contract.yaml", "contracts/schema.sql",
    "deployment/config.yaml", "deployment/values.sized.yaml", "deployment/docker-compose.yml", "deployment/README.md",
    "starter/usecase.json", "starter/run_usecase.py", "starter/test_usecase.py", "starter/results.json", "starter/Makefile", "starter/Dockerfile", "starter/requirements.txt", "starter/baseline.py", "starter/make_data.py",
]
PLACEHOLDER = re.compile(r"\bTODO\b|\bFIXME\b|NotImplementedError|lorem ipsum|\{\{\s*\w+\s*\}\}|\bundefined\b|\bNaN\b", re.I)


def main() -> int:
    problems: list[str] = []
    with gzip.open(ROOT / "data" / "blueprints.json.gz", "rt", encoding="utf-8") as fh:
        slugs = sorted(u["slug"] for u in json.load(fh))
    on_disk = sorted(f"{p.parent.parent.name}/{p.parent.name}" for p in (ROOT / "templates").glob("*/*/manifest.json"))
    if slugs != on_disk:
        problems.append(f"packs and blueprints differ: {sorted(set(slugs) ^ set(on_disk))[:5]}")
    per_domain: dict[str, int] = {}
    for slug in slugs:
        per_domain[slug.split("/")[0]] = per_domain.get(slug.split("/")[0], 0) + 1
    expected = {d: (125 if d == "healthcare" else 50) for d in per_domain}
    if per_domain != expected or len(per_domain) != 18:
        problems.append(f"expected 18 domains (healthcare 125, the others 50 each), found {per_domain}")

    for slug in slugs:
        pack = ROOT / "templates" / slug
        for rel in REQUIRED:
            f = pack / rel
            if not f.exists() or f.stat().st_size < (5 if rel.endswith("requirements.txt") else 40):
                problems.append(f"{slug}: missing or empty {rel}")
        if problems and len(problems) > 60:
            break
        try:
            for rel in ("contracts/openapi.yaml", "contracts/events.asyncapi.yaml", "contracts/data-contract.yaml", "deployment/config.yaml", "deployment/values.sized.yaml", "deployment/docker-compose.yml"):
                yaml.safe_load((pack / rel).read_text())
        except Exception as e:  # noqa: BLE001
            problems.append(f"{slug}: a YAML file does not parse: {e}"[:200])
        try:
            mf = json.loads((pack / "manifest.json").read_text())
            listed = {f["path"]: f["sha256"] for f in mf["files"]}
            actual = {str(p.relative_to(pack)): hashlib.sha256(p.read_bytes()).hexdigest() for p in pack.rglob("*") if p.is_file() and p.name != "manifest.json" and "__pycache__" not in p.parts and ".pytest_cache" not in p.parts}
            if listed != actual:
                problems.append(f"{slug}: manifest is out of date ({len(set(listed) ^ set(actual))} files differ)")
            res = json.loads((pack / "starter" / "results.json").read_text())
            if res.get("use_case") != slug:
                problems.append(f"{slug}: results.json belongs to {res.get('use_case')}")
            if not res.get("results"):
                problems.append(f"{slug}: results.json has no results")
        except Exception as e:  # noqa: BLE001
            problems.append(f"{slug}: manifest or results unreadable: {e}"[:200])
        for rel in ("README.md", "WORKED_EXAMPLE.md", "FIT.md", "docs/00-use-case-brief.md", "docs/02-delivery-plan.md"):
            text = (pack / rel).read_text() if (pack / rel).exists() else ""
            if PLACEHOLDER.search(text):
                problems.append(f"{slug}: placeholder text in {rel}: {PLACEHOLDER.search(text).group(0)!r}")
        readme = (pack / "README.md").read_text() if (pack / "README.md").exists() else ""
        if slug not in readme:
            problems.append(f"{slug}: README does not name its blueprint")

    for p in ("LICENSE.md", "README.md", "INDEX.md", "catalog.json", "public-catalog.json"):
        if not (ROOT / p).exists():
            problems.append(f"missing {p}")
    for p in problems[:80]:
        print("✖", p)
    print(f"validate_repo: {len(slugs)} packs, {len(problems)} problems")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
