# Reverse Logistics Disposition Optimisation

**BrainSiphon worked template** · Supply Chain & Logistics · latency tier batch · advanced

Decide for each returned item whether to restock, refurbish, liquidate, donate or recycle, maximising recovered value.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `supply-chain/reverse-logistics-returns-flow-optimization`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| True average effect | 0.0686 |
| Naive estimate | 0.1915 |
| Inverse-propensity estimate | 0.0674 |
| Uplift ranking AUC versus random | 0.0076 vs 0.0006 |
| Top versus bottom decile realised uplift | 0.085 vs -0.001 |

## Fit

Exact: the `uplift` engine implements this problem type. Engine: **Treatment effect and causal measurement with known ground truth**. Naive comparison, inverse-propensity weighting and a two-model uplift ranker on a confounded observational sample, scored against the true effect and a randomised holdout.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Condition grade prediction | grade from images |
| Resale price model | expected resale value by channel |
| Processing cost by route | labour and shipping cost |

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
