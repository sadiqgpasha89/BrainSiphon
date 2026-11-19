# Query–Ad Relevance Matching

**BrainSiphon worked template** · AdTech & Marketing · latency tier sub-100ms · advanced

Score semantic relevance between queries and ads to gate eligibility and improve quality scores.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `adtech/query-ad-relevance-matching`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Hit rate at 20, popularity | 0.130 |
| Hit rate at 20, co-visit | 0.544 |
| Hit rate at 20, ordered transitions | 0.578 |
| Hit rate at 20, theme-aware | 0.573 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 99.8% |

## Fit

Adaptable: the `recommender` engine implements a neighbouring problem; see FIT.md. Engine: **Next-item ranking from sessions**. A runnable reference for recommending the next item from the current session: bot filtering, popularity, bag co-visitation, ordered transitions and a theme-aware model, evaluated by hit rate, MRR and coverage on a time split.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Dual-encoder similarity | query and ad embedding cosine |
| Cross-encoder score | joint transformer relevance |
| Keyword match type | exact, phrase, broad |

| Starter feature | What it does |
|---|---|
| current item | the item the user is looking at now |
| recent items | the last few items in the session, in order |
| session theme | share of recent items in each category |
| item popularity | recent interaction counts, corrected for popularity |
| dwell and bot signals | time per item and traversal pattern used to remove non-human sessions |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
