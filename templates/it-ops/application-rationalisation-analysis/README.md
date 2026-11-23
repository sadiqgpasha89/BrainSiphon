# Application Rationalisation Analysis

**BrainSiphon worked template** · IT Operations & Service Management · latency tier batch · advanced

Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `it-ops/application-rationalisation-analysis`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Agreement with planted segments, unscaled | 0.144 |
| Agreement, robust-scaled at the planted k | 0.839 |
| k chosen from data (planted: 6) | 4 |
| Bootstrap stability | 0.967 |
| Smallest segment share | 10.4% |

## Fit

Exact: the `cluster` engine implements this problem type. Engine: **Clustering and segmentation with scaling, outliers and drift**. Unscaled k-means against robust scaling with a data-driven k, bootstrap stability, a minimum segment size and a segment-mix drift check.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Usage trend | active users and transactions |
| Total cost | licence, hosting and support |
| Functional similarity | descriptions and features compared |
| Technical health | end-of-support and vulnerability state |

| Starter feature | What it does |
|---|---|
| value feature (f0) | in currency units, thousands of times larger than the others |
| behaviour features (f1-f3) | separate the segments |
| engagement features (f4-f6) | separate some segments |
| noise feature (f7) | carries little structure |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
