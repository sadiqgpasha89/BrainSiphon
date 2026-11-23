"""Runs this use case's worked example on synthetic data and writes results.json.

    python run_usecase.py
"""

from __future__ import annotations

import json
import pathlib
import platform
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
CFG = json.loads((HERE / "usecase.json").read_text())


def versions() -> dict:
    out = {"python": platform.python_version()}
    for name in ("numpy", "pandas", "sklearn", "scipy"):
        try:
            out[name] = __import__(name).__version__
        except Exception:  # the engine may not need every library
            pass
    return out


def run_example() -> dict:
    import baseline

    kwargs = dict(CFG["knobs"])
    if CFG["seed"] is not None:
        kwargs["seed"] = CFG["seed"]
    start = time.time()
    results = baseline.run(**kwargs)
    return {
        "use_case": CFG["slug"],
        "engine": CFG["engine"],
        "seed": CFG["seed"],
        "knobs": CFG["knobs"],
        "libraries": versions(),
        "seconds": round(time.time() - start, 1),
        "results": results,
    }


def _plain(o):
    return o.item() if hasattr(o, "item") else str(o)


def main() -> None:
    out = run_example()
    (HERE / "results.json").write_text(json.dumps(out, indent=1, default=_plain) + "\n")
    print(json.dumps(out["results"], indent=1, default=_plain)[:6000])


if __name__ == "__main__":
    main()
