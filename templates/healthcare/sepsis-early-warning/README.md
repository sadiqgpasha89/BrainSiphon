# Sepsis Early-Warning System

**BrainSiphon worked template** · Healthcare & Life Sciences · latency tier sub-100ms · staff-principal

Alert clinicians hours before sepsis onset from streaming vitals and labs, with alert burden low enough that nurses keep trusting it.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `healthcare/sepsis-early-warning`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |

- `../../../fde-packs/healthcare/sepsis-early-warning/`: the customer implementation pack (integration code, fixtures, mocks and customer-facing documents).

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
| patients | 2400 |
| train_patients | 1440 |
| test_patients | 480 |
| mews_like.threshold | 3 |
| mews_like.alerts_per_100_patient_days | 10.05 |
| mews_like.sensitivity | 0.6154 |

## Fit

Hand-written for this use case. Engine: **Hand-written starter for this use case**. A starter written for this use case, with its own data generator, tests, contracts and serving layer.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Lactate and trend | latest lactate and 6h slope |
| Missingness pattern | counts of vitals measured in last 4h |
| SIRS and qSOFA drift | change in composite score over 3h |
| Vital-sign slope 3h | change in heart rate, respiratory rate and systolic pressure over 3 hours |
| Reading density 4h | number of vitals charted in the last 4 hours |
| Clinician order frequency | count and timing of lactate orders and blood-culture draws |

| Starter feature | What it does |
|---|---|
| (see starter/README.md) | |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
