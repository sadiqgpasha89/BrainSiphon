# Ad Click-Through Rate Prediction

**BrainSiphon worked template** · AdTech & Marketing · latency tier sub-10ms · staff-principal

Predict click probability for each ad candidate with calibrated outputs at millions of requests per second.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `adtech/ctr-prediction-ads`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |

- `../../../fde-packs/adtech/ctr-prediction-ads/`: the customer implementation pack (integration code, fixtures, mocks and customer-facing documents).

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
| impressions | 300000 |
| ctr | 0.0432 |
| explore_rows | 1346 |
| accidental_clicks_in_train | 171 |
| lr_no_position.logloss | 0.1679 |
| lr_no_position.ne | 0.9231 |

## Fit

Hand-written for this use case. Engine: **Hand-written starter for this use case**. A starter written for this use case, with its own data generator, tests, contracts and serving layer.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Ad-user embedding interaction | dot product of ad and user embeddings |
| Historical CTR with smoothing | Bayesian-smoothed CTR by ad and placement |
| Context features | placement, device, hour |
| Position at display | slot number where the ad was shown, used in training and set to the top slot at serving |
| Ad age and impression count | hours since first impression and log of impressions so far |

| Starter feature | What it does |
|---|---|
| (see starter/README.md) | |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
