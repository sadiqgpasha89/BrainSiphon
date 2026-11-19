# Session-Based Next-Item Recommendation

**BrainSiphon worked template** · Retail & E-Commerce · latency tier sub-100ms · advanced

Recommend the next item for anonymous or logged-in sessions in real time, using only in-session behaviour when history is absent.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `retail/session-based-next-item-recommendation`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| train_sessions | 37911 |
| test_sessions | 10808 |
| popularity.hit_rate@20 | 0.07587 |
| popularity.mrr@20 | 0.02475 |
| popularity.coverage | 0.01867 |
| popularity.sessions | 10808 |

## Fit

Hand-written for this use case. Engine: **Hand-written starter for this use case**. A starter written for this use case, with its own data generator, tests, contracts and serving layer.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Last-k item embeddings | transformer encoding of last 20 interactions |
| Dwell and scroll depth | seconds on item pages and scroll fraction |
| Session goal inference | classifier over browse vs compare vs purchase |
| Session theme category | share of recent items in each category |
| Transition recency | how recently each item-to-item transition was observed, decayed over days |

| Starter feature | What it does |
|---|---|
| (see starter/README.md) | |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
