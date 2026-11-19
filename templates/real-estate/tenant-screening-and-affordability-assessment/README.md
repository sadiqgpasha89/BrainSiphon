# Tenant Screening & Affordability Assessment

**BrainSiphon worked template** · Real Estate & PropTech · latency tier seconds · advanced

Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `real-estate/tenant-screening-and-affordability-assessment`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Test-period positive rate | 0.45% |
| Baseline PR-AUC | 0.710 |
| Baseline recall at 0.5% false positives | 73.9% |
| Challenger PR-AUC | 0.758 |
| Challenger recall at 0.5% false positives | 76.9% |

## Fit

Exact: the `tabular` engine implements this problem type. Engine: **Event-level detection with delayed labels**. A runnable reference for scoring individual events (fraud, abuse, default, churn, risk) with point-in-time features, labels that arrive late, a chronological split and a calibrated baseline against a regularised boosted model.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Rent-to-income ratio | monthly rent divided by verified monthly gross income |
| Rental payment history | months of on-time rent payments from reporting agencies or landlord references |
| Income stability | months in the current role and income variance over 12 months |
| Document authenticity | forensic score for edits, template reuse and metadata mismatches |

| Starter feature | What it does |
|---|---|
| short-window activity | count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time |
| shared-group fan-out | distinct entities seen on the same group in the last 24 hours |
| new-group flag | first time this entity is seen on this group |
| counterparty rate | share of confirmed positives at the counterparty, using only labels that had arrived by decision time |
| relative amount | value compared with the entity's own normal |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
