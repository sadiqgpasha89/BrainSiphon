# Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation)

**BrainSiphon worked template** · FinTech & Payments · latency tier sub-100ms · advanced

Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `fintech/payment-authorization-rate-uplift`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| True average effect | 0.0695 |
| Naive estimate | 0.2200 |
| Inverse-propensity estimate | 0.0658 |
| Uplift ranking AUC versus random | 0.0104 vs 0.0023 |
| Top versus bottom decile realised uplift | 0.125 vs -0.038 |

## Fit

Exact: the `uplift` engine implements this problem type. Engine: **Treatment effect and causal measurement with known ground truth**. Naive comparison, inverse-propensity weighting and a two-model uplift ranker on a confounded observational sample, scored against the true effect and a randomised holdout.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Decline code family | normalised scheme response code group |
| Time to payday proximity | days since typical salary credit for the segment |
| Prior retry outcomes | success rate of previous retries for this BIN and code |

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
