# Promotion Uplift & Coupon Targeting: worked example

> Run on synthetic data with `uplift` engine, seed 39206, knobs {"n": 43350, "confound": 1.035, "holdout": 0.158}, in 0.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Send coupons only to customers whose purchase probability rises because of the coupon, maximising incremental margin per promotion dollar.

**Constraints that shape the design.** Promotion budget; Fairness across loyalty tiers; Coupon abuse prevention

**Label in this use case.** For "Promotion Uplift & Coupon Targeting": Send coupons only to customers whose purchase probability rises because of the coupon, maximising incremental margin per promotion dollar. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on non-randomised past promotions.

## 2. Choose the signals

Your strongest signal is **Price sensitivity score** (historical response to discount depth). Its rule: Randomised promos only. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 0.92 on the confounder. The naive comparison reports 0.1907 when the true effect is 0.0691, a bias of 0.1216.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0650 (bias -0.0042). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.116 against 0.004 for the bottom; 20.9% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0691 |
| Naive estimate | 0.1907 |
| Inverse-propensity estimate | 0.0650 |
| Uplift ranking AUC versus random | 0.0084 vs -0.0011 |
| Top versus bottom decile realised uplift | 0.116 vs 0.004 |

## 5. An edge case from the blueprint

**Coupon leak on forums.** untargeted redemption. Planned response: Single-use signed codes with redemption limits. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 43350 |
| `observational_rows` | 36568 |
| `holdout_rows` | 6782 |
| `true_ate` | 0.06914 |
| `naive_ate` | 0.1907 |
| `naive_bias` | 0.12156 |
| `ipw_ate` | 0.064981 |
| `ipw_bias` | -0.0041591 |
| `holdout_ate` | 0.076751 |
| `holdout_balance_smd_x0` | 0.00016658 |
| `observational_balance_smd_x0` | 0.92368 |
| `t_learner_qini_auc` | 0.0083874 |
| `random_ranking_qini_auc` | -0.0011007 |
| `top_decile_realised_uplift` | 0.11588 |
| `bottom_decile_realised_uplift` | 0.0038801 |
| `share_predicted_negative` | 0.20879 |

</details>
