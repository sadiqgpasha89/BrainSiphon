# Collateral Valuation & Haircut Monitoring

**BrainSiphon worked template** · Banking, Financial Services & Insurance · latency tier batch · advanced

Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `bfsi/collateral-valuation-and-haircut-monitoring`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| MAE, ridge baseline | 7.75 |
| MAE, boosted challenger | 5.40 |
| MAE gain over the baseline | 30.4% |
| 80% interval coverage | 64.3% |
| Worst segment versus overall MAE | 1.25x |
| RMSE with a leaky column versus honest | 1.53 vs 11.54 |

## Fit

Exact: the `regression` engine implements this problem type. Engine: **Continuous-target estimation with drift, leakage and heavy tails**. Ridge baseline against a quantile-capable boosted model on a synthetic table with a late drift, heavy-tailed heteroscedastic noise, outliers and a leaky column; reports MAE, RMSE, interval coverage, the worst segment and what a random split hides.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Price momentum and volatility | 20-day return and realised volatility of the reference price |
| Liquidity proxy | traded volume and quoted spread over 30 days |
| Valuation age | days since the last independent valuation |
| Concentration index | share of total pledged value in the same asset or region |

| Starter feature | What it does |
|---|---|
| main driver (x1) | the strongest continuous driver; interacts with x2 and shifts in the last quarter |
| interaction partner (x2) | modifies the effect of x1 and sets the noise level |
| non-linear effect (x3) | a smooth non-linear effect that a straight line cannot fit |
| threshold flag (x4) | matters only above a threshold |
| segment | a categorical segment with its own level and noise |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
