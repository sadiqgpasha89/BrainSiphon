# Warranty Claim Prediction

**BrainSiphon worked template** · Manufacturing & Industry 4.0 · latency tier batch · advanced

Forecast warranty claims by product, build period and failure mode so reserves, supplier recovery and corrective actions are sized correctly.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `manufacturing/warranty-claim-prediction`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| MAE, ridge baseline | 7.69 |
| MAE, boosted challenger | 5.50 |
| MAE gain over the baseline | 28.5% |
| 80% interval coverage | 65.8% |
| Worst segment versus overall MAE | 1.47x |
| RMSE with a leaky column versus honest | 1.51 vs 11.79 |

## Fit

Exact: the `regression` engine implements this problem type. Engine: **Continuous-target estimation with drift, leakage and heavy tails**. Ridge baseline against a quantile-capable boosted model on a synthetic table with a late drift, heavy-tailed heteroscedastic noise, outliers and a leaky column; reports MAE, RMSE, interval coverage, the worst segment and what a random split hides.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Units in service by age | installed base by months in service |
| Early field failure rate | claims per thousand units in the first months |
| Build and supplier lot attributes | plant, line and component lots |
| Usage intensity | duty cycle or mileage |

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
