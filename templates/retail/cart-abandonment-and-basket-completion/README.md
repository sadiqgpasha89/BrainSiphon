# Cart Abandonment & Basket Completion

**BrainSiphon worked template** · Retail & E-Commerce · latency tier sub-100ms · foundational

Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `retail/cart-abandonment-and-basket-completion`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| True average effect | 0.0693 |
| Naive estimate | 0.2167 |
| Inverse-propensity estimate | 0.0665 |
| Uplift ranking AUC versus random | 0.0057 vs 0.0010 |
| Top versus bottom decile realised uplift | 0.115 vs -0.063 |

## Fit

Exact: the `uplift` engine implements this problem type. Engine: **Treatment effect and causal measurement with known ground truth**. Naive comparison, inverse-propensity weighting and a two-model uplift ranker on a confounded observational sample, scored against the true effect and a randomised holdout.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Shipping-cost shock | shipping fee as a share of cart value at reveal |
| Payment error count | declines and validation errors in-session |
| Return-visit pattern | number of cart revisits in 48 hours |

| Starter feature | What it does |
|---|---|
| confounder (x0) | drives both who is treated and the outcome |
| effect modifier (x1) | the treatment helps only when this is positive |
| harm modifier (x2) | with x1 it marks the group the treatment harms |
| outcome driver (x3) | raises the baseline outcome |
| noise (x4) | irrelevant to both |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
