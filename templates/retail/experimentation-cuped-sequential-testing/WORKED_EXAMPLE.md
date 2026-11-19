# Experimentation: CUPED & Sequential Testing: worked example

> Run on synthetic data with `uplift` engine, seed 21981, knobs {"n": 31530, "confound": 1.274, "holdout": 0.156}, in 0.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Speed up online experiments with variance reduction and valid always-on sequential testing so teams ship decisions faster without false positives.

**Constraints that shape the design.** Type-I error control; Many concurrent experiments; Metric definitions governed

**Label in this use case.** For "Experimentation: CUPED & Sequential Testing": Speed up online experiments with variance reduction and valid always-on sequential testing so teams ship decisions faster without false positives. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using post-treatment covariates.

## 2. Choose the signals

Your strongest signal is **Pre-period metric covariate** (user metric in 28 days before assignment). Its rule: Strictly pre-assignment. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.11 on the confounder. The naive comparison reports 0.2052 when the true effect is 0.0690, a bias of 0.1362.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0780 (bias 0.0090). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.137 against 0.039 for the bottom; 17.8% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0690 |
| Naive estimate | 0.2052 |
| Inverse-propensity estimate | 0.0780 |
| Uplift ranking AUC versus random | 0.0060 vs 0.0002 |
| Top versus bottom decile realised uplift | 0.137 vs 0.039 |

## 5. An edge case from the blueprint

**Interference between treatment and control (marketplace).** treated sellers or buyers affect control through shared inventory, biasing the measured effect. Planned response: Cluster or switchback randomisation. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 31530 |
| `observational_rows` | 26667 |
| `holdout_rows` | 4863 |
| `true_ate` | 0.068982 |
| `naive_ate` | 0.2052 |
| `naive_bias` | 0.13621 |
| `ipw_ate` | 0.078018 |
| `ipw_bias` | 0.0090356 |
| `holdout_ate` | 0.063105 |
| `holdout_balance_smd_x0` | 0.026846 |
| `observational_balance_smd_x0` | 1.1094 |
| `t_learner_qini_auc` | 0.0060263 |
| `random_ranking_qini_auc` | 0.0002287 |
| `top_decile_realised_uplift` | 0.13693 |
| `bottom_decile_realised_uplift` | 0.038821 |
| `share_predicted_negative` | 0.17829 |

</details>
