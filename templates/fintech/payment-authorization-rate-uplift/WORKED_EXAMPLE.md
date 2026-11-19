# Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation): worked example

> Run on synthetic data with `uplift` engine, seed 31584, knobs {"n": 35880, "confound": 1.584, "holdout": 0.182}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points.

**Constraints that shape the design.** Retry limits set by card schemes; Never retry hard declines; Customer friction budget

**Label in this use case.** For "Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation)": Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational retry data confounded by who was retried.

## 2. Choose the signals

Your strongest signal is **Decline code family** (normalised scheme response code group). Its rule: Map codes per scheme and version. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.30 on the confounder. The naive comparison reports 0.2200 when the true effect is 0.0695, a bias of 0.1505.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0658 (bias -0.0037). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.125 against -0.038 for the bottom; 21.4% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0695 |
| Naive estimate | 0.2200 |
| Inverse-propensity estimate | 0.0658 |
| Uplift ranking AUC versus random | 0.0104 vs 0.0023 |
| Top versus bottom decile realised uplift | 0.125 vs -0.038 |

## 5. An edge case from the blueprint

**Scheme rule change.** retry now violates network limits. Planned response: Rules-as-config with automated compliance tests. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 35880 |
| `observational_rows` | 29470 |
| `holdout_rows` | 6410 |
| `true_ate` | 0.069463 |
| `naive_ate` | 0.22001 |
| `naive_bias` | 0.15054 |
| `ipw_ate` | 0.065808 |
| `ipw_bias` | -0.0036544 |
| `holdout_ate` | 0.089433 |
| `holdout_balance_smd_x0` | -0.0030135 |
| `observational_balance_smd_x0` | 1.297 |
| `t_learner_qini_auc` | 0.01041 |
| `random_ranking_qini_auc` | 0.0023075 |
| `top_decile_realised_uplift` | 0.12481 |
| `bottom_decile_realised_uplift` | -0.037791 |
| `share_predicted_negative` | 0.21357 |

</details>
