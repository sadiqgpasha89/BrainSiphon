# Public Service Case Routing and Priority

**BrainSiphon worked template** · Public Sector & Government · latency tier seconds · advanced

Route incoming cases to the right team and flag those at risk of missing a legal deadline, so staff time goes to the urgent and complex.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `public-sector/public-service-case-routing`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Majority-class accuracy | 23.8% |
| Macro-F1, baseline | 0.791 |
| Macro-F1, challenger | 0.781 |
| Calibration error, baseline versus challenger | 0.026 vs 0.032 |
| Score inflation from a leaky random split | 0.034 |

## Fit

Exact: the `multiclass` engine implements this problem type. Engine: **Multi-class classification with group leakage and a drifting prior**. Calibrated multinomial baseline against a boosted challenger, scored with macro-F1, per-class recall and calibration, on data with repeat entities, a confusable class pair and a prior that drifts.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Case type and complexity indicators | type, parties and documents |
| Days to statutory deadline | time left to a legal limit |
| Team capacity and skills | open load and specialisms |
| Reopen and escalation history | prior returns and escalations |

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
