# Behavioural Customer Segmentation with Embeddings

**BrainSiphon worked template** · Retail & E-Commerce · latency tier batch · foundational

Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `retail/customer-segmentation-embeddings`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Agreement with planted segments, unscaled | 0.187 |
| Agreement, robust-scaled at the planted k | 0.958 |
| k chosen from data (planted: 6) | 5 |
| Bootstrap stability | 0.953 |
| Smallest segment share | 11.0% |

## Fit

Exact: the `cluster` engine implements this problem type. Engine: **Clustering and segmentation with scaling, outliers and drift**. Unscaled k-means against robust scaling with a data-driven k, bootstrap stability, a minimum segment size and a segment-mix drift check.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Sequence embedding of purchases | transformer over order sequences |
| Price-tier mix | share of basket by price tier |
| Channel and device mix | online, store, app proportions |

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
