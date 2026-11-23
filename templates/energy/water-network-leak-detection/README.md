# Water Network Leak Detection

**BrainSiphon worked template** · Energy & Utilities · latency tier batch · advanced

Detect and localise leaks in water distribution from district meter flows, pressure loggers and acoustic sensors so crews find them before they burst.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `energy/water-network-leak-detection`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Recall, naive z-score | 56.8% |
| Recall, seasonal z-score | 91.4% |
| Recall, seasonal with calendar | 95.1% |
| False alerts per series-week, with calendar | 0.57 |
| Median detection delay, with calendar (hours) | 0.0 |

## Fit

Adaptable: the `anomaly` engine implements a neighbouring problem; see FIT.md. Engine: **Anomaly detection on seasonal metrics**. A runnable reference for detecting anomalies in operational metrics: a rolling z-score, a robust seasonal baseline and a calendar-aware version, judged by recall, detection delay and false alerts per series per week at a fixed alert budget.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Minimum night flow | flow in the lowest-use hours |
| Pressure transient pattern | pressure drops and surges |
| Acoustic noise level | leak noise on hydrophones |
| Consumption in the district | billed use by district |

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
