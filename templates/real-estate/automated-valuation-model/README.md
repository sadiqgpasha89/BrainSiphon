# Automated Valuation Model (AVM)

**BrainSiphon worked template** · Real Estate & PropTech · latency tier seconds · advanced

Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `real-estate/automated-valuation-model`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |

- `../../../fde-packs/real-estate/automated-valuation-model/`: the customer implementation pack (integration code, fixtures, mocks and customer-facing documents).

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
| MAE, ridge baseline | 6.26 |
| MAE, boosted challenger | 3.67 |
| MAE gain over the baseline | 41.5% |
| 80% interval coverage | 72.6% |
| Worst segment versus overall MAE | 1.47x |
| RMSE with a leaky column versus honest | 1.43 vs 7.09 |

## Fit

Exact: the `regression` engine implements this problem type. Engine: **Continuous-target estimation with drift, leakage and heavy tails**. Ridge baseline against a quantile-capable boosted model on a synthetic table with a late drift, heavy-tailed heteroscedastic noise, outliers and a leaky column; reports MAE, RMSE, interval coverage, the worst segment and what a random split hides.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Comparable sale density | count and recency of sales within 0.5 km and 90 days |
| Price per square metre by micro-area | trailing median adjusted for size and type |
| Condition score from photos | vision model grade of kitchen, bathroom and exterior |
| Renovation permits | permits for kitchen, extension or roof in the last 10 years |

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
