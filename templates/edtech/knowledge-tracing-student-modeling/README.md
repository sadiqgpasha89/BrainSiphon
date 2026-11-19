# Knowledge Tracing & Student Modelling

**BrainSiphon worked template** · EdTech & Learning · latency tier sub-100ms · advanced

Estimate each learner's evolving mastery per skill from their answer history to drive practice selection and progress reports.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `edtech/knowledge-tracing-student-modeling`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |

- `../../../fde-packs/edtech/knowledge-tracing-student-modeling/`: the customer implementation pack (integration code, fixtures, mocks and customer-facing documents).

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
| students | 2500 |
| answers | 349830 |
| test_students | 625 |
| test_answers | 87551 |
| skill_running_accuracy.auc | 0.5802 |
| skill_running_accuracy.rmse | 0.5147 |

## Fit

Hand-written for this use case. Engine: **Hand-written starter for this use case**. A starter written for this use case, with its own data generator, tests, contracts and serving layer.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Recent correctness with recency weighting | exponentially weighted correct rate per skill |
| Item difficulty parameter | IRT difficulty of the question |
| Time-since-last-practice | gap since skill practice |
| Prior failures on the skill | count of earlier wrong answers on the same skill |
| Question difficulty from other learners | smoothed correct rate of the question among training students |

| Starter feature | What it does |
|---|---|
| (see starter/README.md) | |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
