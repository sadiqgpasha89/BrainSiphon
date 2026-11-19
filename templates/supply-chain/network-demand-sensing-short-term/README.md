# Short-Term Demand Sensing

**BrainSiphon worked template** · Supply Chain & Logistics · latency tier batch · advanced

Blend point-of-sale, order and external signals into 1-14 day demand forecasts that react to what is actually happening this week.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `supply-chain/network-demand-sensing-short-term`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| rows | 27269 |
| h1.wmape_model | 0.1164 |
| h1.wmape_baseline | 0.2035 |
| h1.fva | 0.428 |
| h3.wmape_model | 0.1159 |
| h3.wmape_baseline | 0.2023 |

## Fit

Hand-written for this use case. Engine: **Hand-written starter for this use case**. A starter written for this use case, with its own data generator, tests, contracts and serving layer.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Open order book | confirmed orders not yet shipped by SKU |
| Sell-through momentum | 7-day vs 28-day velocity ratio |
| External event signal | weather, strikes, promotions known in advance |
| Planned promotion flag | whether the target day sits inside a scheduled promotion |
| Same-weekday history | mean of the last two or three same-weekday sales before the origin |

| Starter feature | What it does |
|---|---|
| (see starter/README.md) | |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
