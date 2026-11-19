# Title & Deed Fraud Detection

**BrainSiphon worked template** · Real Estate & PropTech · latency tier seconds · advanced

Detect forged deeds, owner impersonation and suspicious transfers before closing or recording.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `real-estate/title-and-deed-fraud-detection`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Test-period positive rate | 0.22% |
| Baseline PR-AUC | 0.550 |
| Baseline recall at 0.5% false positives | 74.8% |
| Challenger PR-AUC | 0.658 |
| Challenger recall at 0.5% false positives | 78.1% |

## Fit

Adaptable: the `tabular` engine implements a neighbouring problem; see FIT.md. Engine: **Event-level detection with delayed labels**. A runnable reference for scoring individual events (fraud, abuse, default, churn, risk) with point-in-time features, labels that arrive late, a chronological split and a calibrated baseline against a regularised boosted model.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Ownership change speed | days between the first filing and the transfer to a new owner or a loan against the property |
| Notary frequency | number of filings by the same notary in the last 30 days compared with their norm |
| Vacant or no-mortgage property | flag for property that is vacant or has no mortgage |
| Signature similarity | similarity score of the signature against previous filings by the owner |

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
