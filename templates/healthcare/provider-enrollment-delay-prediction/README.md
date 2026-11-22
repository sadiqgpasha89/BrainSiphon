# Provider Enrollment Delay Prediction

**BrainSiphon worked template** · Healthcare & Life Sciences · latency tier batch · advanced

Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `healthcare/provider-enrollment-delay-prediction`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Event rate by month 12 (Kaplan-Meier) | 50.5% |
| Counting censored as non-events | 42.4% |
| Dropping subjects not yet observed for a full period | 70.9% |
| Concordance index | 0.728 |
| Mean decile calibration gap | 2.8% |

## Fit

Exact: the `survival` engine implements this problem type. Engine: **Time-to-event with censoring**. Kaplan-Meier, a naive complete-case classifier and a discrete-time hazard model on cohorts with administrative censoring and drop-out, scored with a concordance index and decile calibration.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Completeness at submission | share of required items present on submission |
| Payer SLA position | days elapsed against the payer's stated turnaround |
| Stage dwell time | time spent in the current stage relative to the payer median |
| Follow-up count | number of status follow-ups made so far |

| Starter feature | What it does |
|---|---|
| risk factor (x0) | raises the hazard |
| protective factor (x1) | lowers the hazard |
| secondary risk (x2) | a smaller risk effect |
| noise (x3) | irrelevant |
| entry date | the cohort the subject joined, used for the time-based split |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
