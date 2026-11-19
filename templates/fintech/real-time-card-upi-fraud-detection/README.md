# Real-Time Card & UPI Fraud Detection

**BrainSiphon worked template** · FinTech & Payments · latency tier sub-10ms · advanced

Block fraudulent authorisations inside the payment auth path while keeping false declines under 0.3% of genuine volume.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `fintech/real-time-card-upi-fraud-detection`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |

- `../../../fde-packs/fintech/real-time-card-upi-fraud-detection/`: the customer implementation pack (integration code, fixtures, mocks and customer-facing documents).

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
| seed | 7 |
| rows | 188594 |
| fraud_rate | 0.003569 |
| test_rows | 63281 |
| test_fraud_rate | 0.004646 |
| policy_assumptions.max_false_decline | 0.003 |

## Fit

Hand-written for this use case. Engine: **Hand-written starter for this use case**. A starter written for this use case, with its own data generator, tests, contracts and serving layer.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Card velocity 1m/1h/24h | count and sum of authorisations in sliding windows keyed by card token |
| Device-card fan-out | distinct cards seen on the device fingerprint in 24h |
| Merchant risk drift | 7-day chargeback rate of the merchant versus its 90-day baseline |
| New device for card | first time this card token is seen on this device fingerprint |
| Amount versus card baseline | amount divided by the card's trailing 90-day median ticket |
| Mule-ring risk scalar | component risk and hop distance to known mule seeds, written to the online store every few seconds by a streaming graph worker (Flink with Neo4j or TigerGraph, or incremental connected components) |
| Payload-only score inputs | amount, payee MCC, device fingerprint and a local Bloom-filter blocklist hit, all present in the request |

| Starter feature | What it does |
|---|---|
| (see starter/README.md) | |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
