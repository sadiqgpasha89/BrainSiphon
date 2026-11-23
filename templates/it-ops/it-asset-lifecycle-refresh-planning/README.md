# IT Asset Lifecycle and Refresh Planning

**BrainSiphon worked template** · IT Operations & Service Management · latency tier batch · foundational

Forecast device and server refresh needs from age, failure risk and support dates and plan purchases and disposal across the year within budget.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `it-ops/it-asset-lifecycle-refresh-planning`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Majority-class accuracy | 27.4% |
| Macro-F1, baseline | 0.826 |
| Macro-F1, challenger | 0.811 |
| Calibration error, baseline versus challenger | 0.020 vs 0.053 |
| Score inflation from a leaky random split | 0.040 |

## Fit

Exact: the `multiclass` engine implements this problem type. Engine: **Multi-class classification with group leakage and a drifting prior**. Calibrated multinomial baseline against a boosted challenger, scored with macro-F1, per-class recall and calibration, on data with repeat entities, a confusable class pair and a prior that drifts.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Failure risk | predicted failure probability |
| Vendor support end dates | end of support |
| Utilisation and role needs | workload needs |
| Budget limits | approved spend |

| Starter feature | What it does |
|---|---|
| separating feature (x1) | the feature that best separates the classes |
| second separating feature (x2) | a second independent separator |
| confusable-pair feature (x3) | the feature on which classes 2 and 3 barely differ |
| noise feature (x4) | carries little class information |
| entity group | the repeat entity that must not appear on both sides of a split |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
