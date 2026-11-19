# Course & Career Path Recommendation

**BrainSiphon worked template** · EdTech & Learning · latency tier sub-100ms · advanced

Recommend courses and learning paths aligned with learner goals and labour-market skills, balancing interest and career outcomes.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `edtech/course-recommendation-career-paths`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Hit rate at 20, popularity | 0.077 |
| Hit rate at 20, co-visit | 0.539 |
| Hit rate at 20, ordered transitions | 0.574 |
| Hit rate at 20, theme-aware | 0.576 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 99.9% |

## Fit

Adaptable: the `recommender` engine implements a neighbouring problem; see FIT.md. Engine: **Next-item ranking from sessions**. A runnable reference for recommending the next item from the current session: bot filtering, popularity, bag co-visitation, ordered transitions and a theme-aware model, evaluated by hit rate, MRR and coverage on a time split.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Skill-gap vector | target role skills minus current skills |
| Course completion likelihood | predicted completion for learner |
| Market demand for skill | job-posting trends |

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
