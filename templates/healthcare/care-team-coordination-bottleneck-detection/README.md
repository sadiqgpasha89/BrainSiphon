# Care-Team Coordination Bottleneck Detection

**BrainSiphon worked template** · Healthcare & Life Sciences · latency tier batch · advanced

Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `healthcare/care-team-coordination-bottleneck-detection`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Recall, naive z-score | 52.8% |
| Recall, seasonal z-score | 77.5% |
| Recall, seasonal with calendar | 97.8% |
| False alerts per series-week, with calendar | 0.50 |
| Median detection delay, with calendar (hours) | 0.0 |

## Fit

Adaptable: the `anomaly` engine implements a neighbouring problem; see FIT.md. Engine: **Anomaly detection on seasonal metrics**. A runnable reference for detecting anomalies in operational metrics: a rolling z-score, a robust seasonal baseline and a calendar-aware version, judged by recall, detection delay and false alerts per series per week at a fixed alert budget.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Stage waiting time | time between handoff and the next action for each stage |
| Handoff volume and queue length | work waiting at the stage |
| Variant frequency | share of cases following each path |
| Staffing and census context | staffing level and census at the time |

| Starter feature | What it does |
|---|---|
| seasonal residual | value minus the median of the same hour of the same weekday in previous weeks |
| robust spread | median absolute deviation of recent residuals |
| calendar flag | known events that are supposed to move the level |
| level shift and drift features | persistence of a deviation over several hours |
| alert refractory period | quiet time after an alert so one event raises one alert |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
