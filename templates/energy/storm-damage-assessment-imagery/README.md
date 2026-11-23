# Storm Damage Assessment from Imagery

**BrainSiphon worked template** · Energy & Utilities · latency tier batch · advanced

Assess damage to poles, lines and substations after storms from aerial, drone and satellite images so crews and materials are sent to the right places quickly.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `energy/storm-damage-assessment-imagery`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Event rate by month 12 (Kaplan-Meier) | 51.6% |
| Counting censored as non-events | 44.1% |
| Dropping subjects not yet observed for a full period | 71.1% |
| Concordance index | 0.718 |
| Mean decile calibration gap | 2.5% |

## Fit

Exact: the `survival` engine implements this problem type. Engine: **Time-to-event with censoring**. Kaplan-Meier, a naive complete-case classifier and a discrete-time hazard model on cohorts with administrative censoring and drop-out, scored with a concordance index and decile calibration.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Damage class scores | model scores for poles, wires and equipment |
| Location and customers affected | where damage sits and who is without power |
| Image quality and coverage | resolution and cloud cover |
| Road access | road status near damage |

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
