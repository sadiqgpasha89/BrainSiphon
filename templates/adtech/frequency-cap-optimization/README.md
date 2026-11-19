# Frequency Cap & Exposure Optimisation

**BrainSiphon worked template** · AdTech & Marketing · latency tier sub-100ms · advanced

Decide how often to show ads to each user to maximise conversions while limiting wasted impressions and annoyance.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `adtech/frequency-cap-optimization`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| True value, best constant action | 0.399 |
| True value, learned policy | 0.692 |
| Doubly robust estimate, learned policy | 0.702 |
| Inverse-propensity estimate, learned policy | 0.691 |
| Naive matched-rows estimate, learned policy | 0.733 |

## Fit

Adaptable: the `bandit` engine implements a neighbouring problem; see FIT.md. Engine: **Decisions from logged data with off-policy evaluation**. A runnable reference for choosing actions (offers, prices, notifications, routes, treatments) from logged decisions: a reward model, a learned policy, and four offline estimators compared with the hidden true value of each policy.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Marginal conversion gain | conversion probability change per exposure |
| Recent exposure count | impressions in 24h and 7d |
| User responsiveness | prior response to the advertiser |

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
