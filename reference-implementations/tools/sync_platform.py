"""Copy the shared platform (_platform/bsref) into every implementation's src/bsref.

    python tools/sync_platform.py           write the copies
    python tools/sync_platform.py --check   exit 1 if any copy differs from the source (used in CI)

Each implementation is self-contained on purpose: you can copy one directory out of this repository and it runs.
"""

from __future__ import annotations

import filecmp
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "_platform" / "bsref"


def implementations() -> list[Path]:
    return sorted(p for p in ROOT.iterdir() if p.is_dir() and (p / "configs").is_dir() and not p.name.startswith(("_", ".")))


def files(root: Path) -> set[str]:
    return {str(p.relative_to(root)) for p in root.rglob("*") if p.is_file() and "__pycache__" not in p.parts}


def main() -> int:
    check = "--check" in sys.argv
    stale = []
    for impl in implementations():
        target = impl / "src" / "bsref"
        same = target.exists() and files(SOURCE) == files(target) and all(
            filecmp.cmp(SOURCE / f, target / f, shallow=False) for f in files(SOURCE)
        )
        if same:
            continue
        if check:
            stale.append(impl.name)
            continue
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(SOURCE, target, ignore=shutil.ignore_patterns("__pycache__"))
        print(f"synced {impl.name}/src/bsref")
    if stale:
        print("stale platform copy in: " + ", ".join(stale) + "\nrun: python tools/sync_platform.py")
        return 1
    print("platform copies are in sync" if check else "done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
