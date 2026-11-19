# Video Ad Placement & Pod Optimisation

**BrainSiphon worked template** · AdTech & Marketing · latency tier sub-100ms · advanced

Choose ad slots, pod length and creatives in streaming video to maximise revenue and completion while limiting viewer abandonment.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `adtech/video-ad-placement-optimization`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Tracking error, open loop | 7.14% |
| Tracking error, PID | 2.76% |
| Reduction versus open loop | 61.4% |
| Control jitter, PID versus aggressive gains | 0.012 vs 0.085 |
| Tracking error with a two-hour feedback delay | 5.39% |

## Fit

Exact: the `control` engine implements this problem type. Engine: **Sequential control: pacing, throttling and limits under delay and shocks**. Open-loop schedule against a PID pacer with anti-windup over 288 five-minute steps with outages, surges and delayed feedback; reports tracking error, overshoot, under-delivery and control-effort noise.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Viewer abandonment hazard | probability to drop at ad break |
| Content break-point score | scene-boundary detector |
| Predicted ad completion | completion probability by creative |

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
