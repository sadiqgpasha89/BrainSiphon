"""Build the ZIP release archive.

    python3 tools/build_release.py [--version 1.0.0]

Writes dist/brainsiphon-<version>.zip and dist/SHA256SUMS. The archive contains the repository without git history, reports and the
owner/ folder.
Run tools/validate_repo.py first: this script refuses to build when it fails.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", ".reports", "dist", "owner", "__pycache__", ".pytest_cache", ".venv", "node_modules"}
SKIP_SUFFIX = {".pyc", ".csv"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--licensee", default="")
    ap.add_argument("--version", default="")
    ap.add_argument("--skip-validate", action="store_true")
    a = ap.parse_args()
    version = a.version or (re.search(r"^## (\S+)", (ROOT / "CHANGELOG.md").read_text(), re.M) or [None, "0.0.0"])[1]
    if not a.skip_validate and subprocess.run([sys.executable, str(ROOT / "tools" / "validate_repo.py")]).returncode != 0:
        print("validate_repo failed; not building a release", file=sys.stderr)
        return 1
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    name = f"brainsiphon-{version}" + (f"-{re.sub(r'[^a-z0-9]+', '-', a.licensee.lower()).strip('-')[:40]}" if a.licensee else "")
    out = dist / f"{name}.zip"
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(ROOT.rglob("*")):
            rel = p.relative_to(ROOT)
            if not p.is_file() or set(rel.parts) & SKIP_DIRS or p.suffix in SKIP_SUFFIX:
                continue
            z.write(p, f"brainsiphon/{rel}")
            count += 1
        if a.licensee:
            z.writestr("brainsiphon/LICENSED-TO.txt", f"This copy of BrainSiphon {version} is licensed to:\n{a.licensee}\n\nSee LICENSE.md.\n")
    digest = hashlib.sha256(out.read_bytes()).hexdigest()
    (dist / "SHA256SUMS").open("a").write(f"{digest}  {out.name}\n")
    print(f"{out.relative_to(ROOT)}: {count} files, {out.stat().st_size / 1e6:.1f} MB, sha256 {digest[:16]}…")
    return 0


if __name__ == "__main__":
    sys.exit(main())
