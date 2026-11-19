# Geo Experiments & Incrementality Testing: worked example

> Run on synthetic data with `uplift` engine, seed 79837, knobs {"n": 32410, "confound": 1.001, "holdout": 0.126}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Design and analyse geo-based holdout tests that measure true incremental effect of ads when user-level tracking is unavailable.

**Constraints that shape the design.** Few geos; Spillover; Power and duration

**Label in this use case.** For "Geo Experiments & Incrementality Testing": Design and analyse geo-based holdout tests that measure true incremental effect of ads when user-level tracking is unavailable. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using post-period information in matching.

## 2. Choose the signals

Your strongest signal is **Pre-period fit quality** (RMSE of synthetic control). Its rule: Window. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 0.89 on the confounder. The naive comparison reports 0.1794 when the true effect is 0.0686, a bias of 0.1108.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0649 (bias -0.0036). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.187 against 0.053 for the bottom; 24.8% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0686 |
| Naive estimate | 0.1794 |
| Inverse-propensity estimate | 0.0649 |
| Uplift ranking AUC versus random | 0.0085 vs -0.0018 |
| Top versus bottom decile realised uplift | 0.187 vs 0.053 |

## 5. An edge case from the blueprint

**Concurrent campaigns contaminate holdout geos.** measured lift is biased. Planned response: Campaign calendar checks and exclusion rules. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Evaluate a ranking only on randomised data, keep a permanent holdout, and treat a predicted-negative group as a decision, not a rounding error.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 32410 |
| `observational_rows` | 28300 |
| `holdout_rows` | 4110 |
| `true_ate` | 0.06859 |
| `naive_ate` | 0.17935 |
| `naive_bias` | 0.11076 |
| `ipw_ate` | 0.064944 |
| `ipw_bias` | -0.0036457 |
| `holdout_ate` | 0.076192 |
| `holdout_balance_smd_x0` | 0.061157 |
| `observational_balance_smd_x0` | 0.89261 |
| `t_learner_qini_auc` | 0.0085434 |
| `random_ranking_qini_auc` | -0.0017822 |
| `top_decile_realised_uplift` | 0.18704 |
| `bottom_decile_realised_uplift` | 0.052546 |
| `share_predicted_negative` | 0.24818 |

</details>
