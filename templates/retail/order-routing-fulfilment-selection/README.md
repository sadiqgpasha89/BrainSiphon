# Order Routing & Fulfilment Node Selection

**BrainSiphon worked template** · Retail & E-Commerce · latency tier sub-100ms · staff-principal

Choose the warehouse or store that fulfils each order to minimise shipping cost and delay while protecting inventory for future demand.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `retail/order-routing-fulfilment-selection`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Regret versus oracle, greedy | 30.5% |
| Regret versus oracle, optimal on predictions | 12.7% |
| Regret versus oracle, optimal with an uncertainty penalty | 10.2% |
| Promised versus realised cost gap, optimal on predictions | 24.3% |

## Fit

Adaptable: the `optimize` engine implements a neighbouring problem; see FIT.md. Engine: **Allocation under predicted costs**. A runnable reference for allocation, routing and scheduling from predicted costs: greedy assignment, optimal assignment on predictions and optimal assignment with an uncertainty penalty, compared on realised cost and on how optimistic the promise was.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Node inventory confidence | probability the item is truly available |
| Shipping cost and zone | carrier rate to destination zone |
| Node pick capacity utilisation | orders pending vs capacity |

| Starter feature | What it does |
|---|---|
| predicted cost | model estimate of the cost of each task-resource pairing |
| prediction uncertainty | how reliable each estimate is |
| hard constraints | capacity, time windows and compatibility the plan must satisfy |
| promised versus realised cost | what the plan said it would cost against what it cost |
| plan churn | how much the plan changes between re-solves |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
