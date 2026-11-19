# Home Search Ranking

**BrainSiphon worked template** · Real Estate & PropTech · latency tier sub-100ms · advanced

Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `real-estate/home-search-ranking`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Hit rate at 20, popularity | 0.121 |
| Hit rate at 20, co-visit | 0.575 |
| Hit rate at 20, ordered transitions | 0.607 |
| Hit rate at 20, theme-aware | 0.597 |
| Catalogue coverage, popularity versus theme-aware | 1.9% vs 99.7% |

## Fit

Adaptable: the `recommender` engine implements a neighbouring problem; see FIT.md. Engine: **Next-item ranking from sessions**. A runnable reference for recommending the next item from the current session: bot filtering, popularity, bag co-visitation, ordered transitions and a theme-aware model, evaluated by hit rate, MRR and coverage on a time split.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Price fit | position of the price within the buyer's stated range, scaled from 0 to 1 |
| Saved and shared | saves and shares of this listing by buyers with similar filters in the last 7 days |
| Listing freshness | hours since the listing went live, passed through a decay function |
| Commute fit | travel time from the home to the buyer's saved workplace at rush hour |

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
