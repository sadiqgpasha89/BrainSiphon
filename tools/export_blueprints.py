"""Export the blueprint data the pack generator reads from a checkout of the public BrainSiphon repository.

    python tools/export_blueprints.py /path/to/BrainSiphon       # after `npm run content:build` there

Writes data/blueprints.json.gz: one record per use case, with the heavy presentation-only fields (diagrams, role lenses, agent
sections) removed and the kit-derived playbook parts (starter code, sample rows, worked example) dropped, because the packs
produce their own from a real run.
"""
from __future__ import annotations

import gzip
import json
import pathlib
import sys

DROP_TOP = {"roleLenses", "primitives", "agentic", "id", "narrativeProvenance"}


def strip(obj):
    if isinstance(obj, dict):
        return {k: strip(v) for k, v in obj.items() if k not in {"mermaid", "mermaidDiagram", "classDiagram", "c4Context", "c4Container", "tree", "architecture", "sequence"} or not isinstance(v, str)}
    if isinstance(obj, list):
        return [strip(x) for x in obj]
    return obj


def main(src: pathlib.Path, out: pathlib.Path) -> None:
    records = []
    for f in sorted((src / "content" / "generated" / "uc").glob("*/*.json")):
        d = json.loads(f.read_text())
        for k in DROP_TOP:
            d.pop(k, None)
        pb = d.get("playbook", {})
        pb.pop("starter", None)
        pb.pop("workedExample", None)
        pb.get("data", {}).pop("sample", None)
        pb.get("data", {}).pop("synthetic", None)
        records.append(strip(d))
    out.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(out, "wt", encoding="utf-8") as fh:
        json.dump(records, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"{len(records)} blueprints -> {out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    root = pathlib.Path(__file__).resolve().parent.parent
    main(pathlib.Path(sys.argv[1]), root / "data" / "blueprints.json.gz")
