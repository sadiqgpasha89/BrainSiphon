# Developer Documentation Assistant

**BrainSiphon worked template** · SaaS & Product · latency tier seconds · advanced

Answer developer questions about APIs and SDKs with correct, version-specific code snippets and links to authoritative docs.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `saas/developer-docs-assistant`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |

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
| chunks | 132 |
| golden | 132 |
| test_questions | 66 |
| naive.answerable | 48 |
| naive.unanswerable | 18 |
| naive.accuracy | 0.6042 |

## Fit

Hand-written for this use case. Engine: **Hand-written starter for this use case**. A starter written for this use case, with its own data generator, tests, contracts and serving layer.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| API existence check | referenced symbols found in spec |
| Snippet execution pass | sandbox run succeeds |
| Version match | docs version equals user version |
| Citation supports the value | the cited passage literally contains the stated value |
| Abstention precision | share of declined questions that are truly unanswerable |

| Starter feature | What it does |
|---|---|
| (see starter/README.md) | |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
