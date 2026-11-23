"""Render the parts of each pack that depend on its real results, then write the manifests and the catalogue.

    python3 tools/render_results.py

Reads templates/*/*/starter/results.json (written by tools/run_packs.py) and writes, per pack:
  README.md, WORKED_EXAMPLE.md, manifest.json
and for the repository: catalog.json, INDEX.md, public-catalog.json.
Fails if a pack has no results or if any figure cannot be read, so a pack is never published without a real run behind it.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from packgen.engines import ROOT, engine_meta  # noqa: E402
from packgen.md import cell, get, table  # noqa: E402
from packgen.stories import flatten, story  # noqa: E402

GENERATOR_VERSION = "1.0.0"
DOMAIN_NAMES = {
    "fintech": "FinTech & Payments", "retail": "Retail & E-Commerce", "healthcare": "Healthcare & Life Sciences", "supply-chain": "Supply Chain & Logistics",
    "adtech": "AdTech & Marketing", "cybersecurity": "Cybersecurity", "edtech": "EdTech & Learning", "saas": "SaaS & Product", "bfsi": "Banking, Financial Services & Insurance",
    "real-estate": "Real Estate & PropTech",
    "telecom": "Telecom & Network Operations", "manufacturing": "Manufacturing & Industry 4.0", "energy": "Energy & Utilities", "public-sector": "Public Sector & Government",
    "public-safety": "Public Safety & Emergency Services", "devtools": "Developer Tools & Software Delivery", "it-ops": "IT Operations & Service Management", "engineering": "Engineering & Product Design",
}


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def bullet_list(items) -> str:
    return "\n".join(f"- {i}" for i in items)


def worked_example(u: dict, cfg: dict, res: dict, meta: dict) -> str:
    r = res["results"]
    s = story(cfg["engine"], r)
    sig = (cfg.get("blueprintSignals") or [{}])[0]
    feat = (cfg.get("engineFeatures") or [{}])[0]
    edge = (u.get("productionEdgeCases") or [{}])[0]
    objective = get(u, "problemFormulation.businessObjective", u.get("summary", ""))
    cons = "; ".join((get(u, "problemFormulation.constraints", []) or [])[:3])
    flat = flatten(r, limit=80)
    rows = "\n".join(f"| `{k}` | {v:.5g} |" if isinstance(v, float) else f"| `{k}` | {v} |" for k, v in flat.items())
    fresh = "Hand-written starter" if cfg["engine"] == "authored" else f"`{cfg['engine']}` engine, seed {cfg['seed']}, knobs {json.dumps(cfg['knobs'])}"
    return f"""# {u['title']}: worked example

> Run on synthetic data with {fresh}, in {res.get('seconds', '?')} s on Python {res['libraries'].get('python', '?')}. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** {objective}

**Constraints that shape the design.** {cons or 'see docs/00-use-case-brief.md'}

**Label in this use case.** {cfg.get('label') or 'see docs/03-data-and-features.md'}

## 2. Choose the signals

Your strongest signal is **{sig.get('name', '')}** ({sig.get('definition', '')}). Its rule: {sig.get('asOfRule', '')}. In the starter, the closest executable idea is **{feat.get('feature', '')}**: {feat.get('meaning', '')}. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

{s['trap']}

## 4. Baseline against the stronger design

{s['compare']}

| Result | Value |
|---|---|
{chr(10).join(f'| {a} | {b} |' for a, b in s['headline'])}

## 5. An edge case from the blueprint

**{edge.get('scenario', '')}.** {edge.get('failureMode', '')}. Planned response: {edge.get('mitigationStrategy', '')}. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

{s['outcome']}

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
{rows}

</details>
"""


def pack_readme(u: dict, cfg: dict, res: dict, meta: dict, authored: bool, fde: bool, files: list[dict]) -> str:
    s = story(cfg["engine"], res["results"])
    domain, key = u["slug"].split("/")
    signals = "\n".join(f"| {x.get('name')} | {x.get('definition')} |" for x in cfg.get("blueprintSignals", [])[:8])
    feats = "\n".join(f"| {x.get('feature')} | {x.get('meaning')} |" for x in cfg.get("engineFeatures", []))
    fit = {"authored": "Hand-written for this use case", "exact": f"Exact: the `{cfg['engine']}` engine implements this problem type", "adaptable": f"Adaptable: the `{cfg['engine']}` engine implements a neighbouring problem; see FIT.md"}[cfg["fit"]]
    fde_line = f"\n- `../../../fde-packs/{domain}/{key}/`: the customer implementation pack (integration code, fixtures, mocks and customer-facing documents).\n" if fde else ""
    return f"""# {u['title']}

**BrainSiphon worked template** · {DOMAIN_NAMES.get(domain, domain)} · latency tier {u.get('latencySLA', '')} · {u.get('difficulty', '')}

{u.get('summary', '')}

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `{u['slug']}`, last verified {u.get('lastVerifiedAt', '')}. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |
{fde_line}
## Run it in two minutes

```bash
cd starter
make setup      # a virtualenv with the pinned libraries
make demo       # runs the worked example and writes results.json
make test       # reproduces results.json and checks every gate
```

## Headline results from the last run

| Result | Value |
|---|---|
{chr(10).join(f'| {a} | {b} |' for a, b in s['headline'])}

## Fit

{fit}. Engine: **{meta['label']}**. {meta.get('summary', '')}

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
{signals}

| Starter feature | What it does |
|---|---|
{feats or '| (see starter/README.md) | |'}

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
"""


def manifest(pack: Path, u: dict, cfg: dict, res: dict, authored: bool, fde: bool) -> dict:
    files = []
    for p in sorted(pack.rglob("*")):
        if p.is_file() and p.name != "manifest.json" and "__pycache__" not in p.parts and ".pytest_cache" not in p.parts:
            files.append({"path": str(p.relative_to(pack)), "bytes": p.stat().st_size, "sha256": sha(p)})
    return {
        "slug": u["slug"],
        "title": u["title"],
        "domain": u["domain"],
        "engine": cfg["engine"],
        "fit": cfg["fit"],
        "problemType": cfg["problemType"],
        "authoredStarter": authored,
        "fdePack": fde,
        "seed": cfg["seed"],
        "knobs": cfg["knobs"],
        "blueprintVerified": u.get("lastVerifiedAt"),
        "generator": GENERATOR_VERSION,
        "libraries": res.get("libraries", {}),
        "runSeconds": res.get("seconds"),
        "files": files,
    }


def main() -> int:
    with gzip.open(ROOT / "data" / "blueprints.json.gz", "rt", encoding="utf-8") as fh:
        records = {u["slug"]: u for u in json.load(fh)}
    catalog, public = [], []
    for slug, u in sorted(records.items()):
        domain, key = slug.split("/")
        pack = ROOT / "templates" / domain / key
        results = pack / "starter" / "results.json"
        if not results.exists():
            print(f"missing results for {slug}: run tools/run_packs.py first", file=sys.stderr)
            return 1
        res = json.loads(results.read_text())
        cfg = json.loads((pack / "starter" / "usecase.json").read_text())
        meta = engine_meta(cfg["engine"]) if cfg["engine"] != "authored" else {"label": "Hand-written starter for this use case", "summary": "A starter written for this use case, with its own data generator, tests, contracts and serving layer."}
        authored, fde = cfg["engine"] == "authored", (ROOT / "fde-packs" / domain / key).exists()
        (pack / "WORKED_EXAMPLE.md").write_text(worked_example(u, cfg, res, meta))
        (pack / "README.md").write_text(pack_readme(u, cfg, res, meta, authored, fde, []))
        mf = manifest(pack, u, cfg, res, authored, fde)
        (pack / "manifest.json").write_text(json.dumps(mf, indent=1) + "\n")
        total = sum(f["bytes"] for f in mf["files"])
        catalog.append({"slug": slug, "title": u["title"], "domain": domain, "engine": cfg["engine"], "engineLabel": meta["label"], "fit": cfg["fit"], "problemType": cfg["problemType"], "authoredStarter": authored, "fdePack": fde, "files": len(mf["files"]), "bytes": total, "path": f"templates/{slug}"})
        docs_list = sorted(f["path"] for f in mf["files"] if f["path"].startswith("docs/"))
        public.append({"slug": slug, "engine": cfg["engine"], "engineLabel": meta["label"], "fit": cfg["fit"], "authoredStarter": authored, "fdePack": fde, "files": len(mf["files"]), "documents": len(docs_list), "contracts": 4, "path": f"templates/{slug}"})
    (ROOT / "catalog.json").write_text(json.dumps(catalog, indent=1) + "\n")
    (ROOT / "public-catalog.json").write_text(json.dumps({"generator": GENERATOR_VERSION, "count": len(public), "packs": public}, indent=1) + "\n")

    by_domain: dict[str, list[dict]] = {}
    for c in catalog:
        by_domain.setdefault(c["domain"], []).append(c)
    out = [f"# Index of the {len(catalog)} worked templates", "", f"Generated by tools/render_results.py ({len(catalog)} packs).", ""]
    for d in sorted(by_domain):
        out += [f"## {DOMAIN_NAMES.get(d, d)} ({len(by_domain[d])})", "", "| Use case | Engine | Fit | Extras |", "|---|---|---|---|"]
        for c in by_domain[d]:
            extras = ", ".join(x for x, on in (("hand-written starter", c["authoredStarter"]), ("customer implementation pack", c["fdePack"])) if on)
            out.append(f"| [{c['title']}]({c['path']}/README.md) | {c['engine']} | {c['fit']} | {extras} |")
        out.append("")
    (ROOT / "INDEX.md").write_text("\n".join(out))
    print(f"rendered {len(catalog)} packs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
