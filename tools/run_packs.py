"""Run every pack's worked example (writes starter/results.json) and, with --test, its pytest suite, in parallel.

    PYTHON=/path/to/venv/bin/python python3 tools/run_packs.py [--test] [--jobs 16] [domain | domain/slug]

The interpreter needs the libraries in starter/requirements.txt. Each worker is limited to one BLAS/OpenMP thread so that many
packs can run side by side without fighting over cores.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY = os.environ.get("PYTHON", sys.executable)


def packs(only: str) -> list[Path]:
    found = sorted(p.parent.parent for p in (ROOT / "templates").glob("*/*/starter/usecase.json"))
    return [p for p in found if not only or str(p.relative_to(ROOT / "templates")).startswith(only)]


def sh(cmd: list[str], cwd: Path, timeout: int) -> tuple[int, str, float]:
    env = {**os.environ, "OMP_NUM_THREADS": "1", "OPENBLAS_NUM_THREADS": "1", "MKL_NUM_THREADS": "1", "PYTHONDONTWRITEBYTECODE": "1"}
    t = time.time()
    try:
        r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)
        return r.returncode, (r.stdout + r.stderr)[-1500:], time.time() - t
    except subprocess.TimeoutExpired:
        return 124, "timeout", time.time() - t


def work(pack: Path, test: bool) -> dict:
    starter = pack / "starter"
    code, out, secs = sh([PY, "run_usecase.py"], starter, 900)
    rec = {"pack": str(pack.relative_to(ROOT / "templates")), "run": "ok" if code == 0 else "FAILED", "run_seconds": round(secs, 1)}
    if code != 0:
        rec["run_output"] = out
    elif test:
        code, out, secs = sh([PY, "-m", "pytest", "-q", "-p", "no:cacheprovider", "-x"], starter, 1800)
        rec.update({"tests": "passed" if code == 0 else "FAILED", "test_seconds": round(secs, 1), "test_tail": out.strip().splitlines()[-1] if out.strip() else ""})
        if code != 0:
            rec["test_output"] = out
    return rec


def main() -> int:
    args = [a for a in sys.argv[1:]]
    test = "--test" in args
    jobs = int(args[args.index("--jobs") + 1]) if "--jobs" in args else max(2, (os.cpu_count() or 4) // 2)
    rest = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or args[i - 1] != "--jobs")]
    todo = packs(rest[0] if rest else "")
    t0 = time.time()
    results = []
    with ThreadPoolExecutor(jobs) as ex:
        for i, rec in enumerate(ex.map(lambda p: work(p, test), todo), 1):
            results.append(rec)
            bad = rec["run"] != "ok" or rec.get("tests") == "FAILED"
            if bad or i % 25 == 0:
                print(f"[{i}/{len(todo)}] {rec['pack']}: run {rec['run']}" + (f", tests {rec.get('tests')}" if test else "") + (f"\n{rec.get('run_output') or rec.get('test_output')}" if bad else ""), flush=True)
    (ROOT / ".reports").mkdir(exist_ok=True)
    (ROOT / ".reports" / "run-report.json").write_text(json.dumps(results, indent=1))
    failed = [r for r in results if r["run"] != "ok" or r.get("tests") == "FAILED"]
    print(f"{len(results) - len(failed)}/{len(results)} packs ok in {time.time() - t0:.0f}s with {jobs} workers")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
