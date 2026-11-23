# CAD Design Rule Checking

**BrainSiphon worked template** · Engineering & Product Design · latency tier seconds · foundational

Check CAD models against company rules and manufacturability limits, such as minimum wall thickness and hole spacing, and explain violations in the design tool.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `engineering/cad-design-rule-checking`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Majority-class accuracy | 24.5% |
| Macro-F1, baseline | 0.809 |
| Macro-F1, challenger | 0.802 |
| Calibration error, baseline versus challenger | 0.014 vs 0.030 |
| Score inflation from a leaky random split | 0.016 |

## Fit

Exact: the `multiclass` engine implements this problem type. Engine: **Multi-class classification with group leakage and a drifting prior**. Calibrated multinomial baseline against a boosted challenger, scored with macro-F1, per-class recall and calibration, on data with repeat entities, a confusable class pair and a prior that drifts.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Feature geometry | walls, holes and radii |
| Rule thresholds | limits by process and material |
| Process selected | casting, machining or printing |
| Past exceptions | approved deviations |

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
