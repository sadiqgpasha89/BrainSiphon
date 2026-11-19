# Order Execution & Slippage Minimisation

**BrainSiphon worked template** · FinTech & Payments · latency tier sub-10ms · staff-principal

Slice large parent orders into child orders that minimise implementation shortfall against arrival price.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `fintech/order-execution-slippage-minimization`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Tracking error, open loop | 5.95% |
| Tracking error, PID | 2.53% |
| Reduction versus open loop | 57.6% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.091 |
| Tracking error with a two-hour feedback delay | 5.29% |

## Fit

Exact: the `control` engine implements this problem type. Engine: **Sequential control: pacing, throttling and limits under delay and shocks**. Open-loop schedule against a PID pacer with anti-windup over 288 five-minute steps with outages, surges and delayed feedback; reports tracking error, overshoot, under-delivery and control-effort noise.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Order-book imbalance | (bid depth - ask depth) / total depth at top 5 levels |
| Spread and depth ratio | spread over mid and depth at touch |
| Remaining-time urgency | residual quantity over remaining horizon |

| Starter feature | What it does |
|---|---|
| cumulative delivery | what has been delivered so far, seen after a delay |
| plan | the target cumulative curve |
| opportunity | the demand available each step, which the controller does not control |
| multiplier | the controller's output each step |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
