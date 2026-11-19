# Retail Banking Churn Prediction: worked example

> Run on synthetic data with `uplift` engine, seed 67502, knobs {"n": 39710, "confound": 1.581, "holdout": 0.174}, in 0.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify customers likely to leave within 90 days and trigger the right retention action at net-positive ROI.

**Constraints that shape the design.** Marketing consent; Offer budget; Weekly scoring

**Label in this use case.** For "Retail Banking Churn Prediction": Identify customers likely to leave within 90 days and trigger the right retention action at net-positive ROI. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting churn and treating without holdout.

## 2. Choose the signals

Your strongest signal is **Salary-credit shift** (share of incoming salary arriving to this account vs prior). Its rule: Detect before closure date. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.32 on the confounder. The naive comparison reports 0.2208 when the true effect is 0.0696, a bias of 0.1512.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0784 (bias 0.0088). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.124 against -0.061 for the bottom; 20.5% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0696 |
| Naive estimate | 0.2208 |
| Inverse-propensity estimate | 0.0784 |
| Uplift ranking AUC versus random | 0.0099 vs -0.0001 |
| Top versus bottom decile realised uplift | 0.124 vs -0.061 |

## 5. An edge case from the blueprint

**Product repricing event.** churn spike unrelated to behaviour. Planned response: Include price-change flags and cohort controls. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 39710 |
| `observational_rows` | 32711 |
| `holdout_rows` | 6999 |
| `true_ate` | 0.069592 |
| `naive_ate` | 0.22078 |
| `naive_bias` | 0.15118 |
| `ipw_ate` | 0.078425 |
| `ipw_bias` | 0.0088331 |
| `holdout_ate` | 0.07621 |
| `holdout_balance_smd_x0` | -0.023102 |
| `observational_balance_smd_x0` | 1.3164 |
| `t_learner_qini_auc` | 0.00991 |
| `random_ranking_qini_auc` | -0.00012199 |
| `top_decile_realised_uplift` | 0.12435 |
| `bottom_decile_realised_uplift` | -0.060726 |
| `share_predicted_negative` | 0.20517 |

</details>
