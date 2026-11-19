# Payment Routing Optimization

**BrainSiphon worked template** · FinTech & Payments · latency tier sub-10ms · staff-principal

Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `fintech/payment-routing-optimization`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| True value, best constant action | 0.429 |
| True value, learned policy | 0.759 |
| Doubly robust estimate, learned policy | 0.762 |
| Inverse-propensity estimate, learned policy | 0.775 |
| Naive matched-rows estimate, learned policy | 0.786 |

## Fit

Exact: the `bandit` engine implements this problem type. Engine: **Decisions from logged data with off-policy evaluation**. A runnable reference for choosing actions (offers, prices, notifications, routes, treatments) from logged decisions: a reward model, a learned policy, and four offline estimators compared with the hidden true value of each policy.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Issuer-BIN success posterior | Beta posterior of auth success per (acquirer, BIN) with 30-minute decay |
| Decline code mix | share of soft vs hard declines by route in the last 15 min |
| Fee schedule delta | effective interchange and scheme fee difference |

| Starter feature | What it does |
|---|---|
| context features | what is known about the situation when the decision is made |
| action | the option chosen: offer, price, route or treatment |
| logged propensity | the probability with which the logging policy chose that action |
| reward model | predicted reward for each action in each context |
| policy | the rule that maps context to action |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
