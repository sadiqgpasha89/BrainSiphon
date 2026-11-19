# Maintenance Request Triage & Dispatch

**BrainSiphon worked template** · Real Estate & PropTech · latency tier seconds · advanced

Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `real-estate/maintenance-request-triage-and-dispatch`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Macro-F1, random split with a leak | 0.905 |
| Macro-F1, honest time split | 0.455 |
| Macro-F1, frozen model next month | 0.846 |
| Calibration error, honest split | 0.059 |
| Duplicate share | 25.1% |

## Fit

Adaptable: the `nlp` engine implements a neighbouring problem; see FIT.md. Engine: **Text classification with leakage and drift checks**. A runnable reference for classifying text (tickets, documents, messages, reviews): TF-IDF with logistic regression evaluated optimistically and honestly, with duplicate threads, a post-hoc leak token and vocabulary drift built in.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Safety phrases | presence of terms such as gas smell, flooding, no heating or sparks in the text |
| Image classifier | probability that the photo shows a leak, mould, broken glass or electrical damage |
| Asset history | number and type of repairs on the unit and the equipment in the last 24 months |
| Weather | temperature and rain forecast at the building on the day |

| Starter feature | What it does |
|---|---|
| topic terms | words and phrases most associated with each class |
| text length and structure | document length, templates and boilerplate |
| source and thread | which conversation or document family a text belongs to |
| recency | when the text was written, for time-based splits |
| calibrated confidence | probability that the top class is right |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
