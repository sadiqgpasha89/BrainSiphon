# Restoration Switching Recommendation

**BrainSiphon worked template** · Energy & Utilities · latency tier seconds · advanced

Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `energy/restoration-switching-recommendation`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Tracking error, open loop | 7.11% |
| Tracking error, PID | 2.57% |
| Reduction versus open loop | 63.8% |
| Control jitter, PID versus aggressive gains | 0.011 vs 0.091 |
| Tracking error with a two-hour feedback delay | 5.74% |

## Fit

Exact: the `control` engine implements this problem type. Engine: **Sequential control: pacing, throttling and limits under delay and shocks**. Open-loop schedule against a PID pacer with anti-windup over 288 five-minute steps with outages, surges and delayed feedback; reports tracking error, overshoot, under-delivery and control-effort noise.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Faulted section and isolation points | location of the fault and the nearest switches |
| Alternate supply capacity | spare capacity on neighbouring feeders |
| Customer priority | critical customers on each section |
| Switch availability | remote or manual operation and crew position |

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
