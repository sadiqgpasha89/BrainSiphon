# Reverse Logistics Disposition Optimisation: worked example

> Run on synthetic data with `uplift` engine, seed 27450, knobs {"n": 36760, "confound": 1.101, "holdout": 0.138}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide for each returned item whether to restock, refurbish, liquidate, donate or recycle, maximising recovered value.

**Constraints that shape the design.** Grading consistency; Warehouse capacity; Brand and safety policies

**Label in this use case.** For "Reverse Logistics Disposition Optimisation": Decide for each returned item whether to restock, refurbish, liquidate, donate or recycle, maximising recovered value. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Resale prices assumed constant.

## 2. Choose the signals

Your strongest signal is **Condition grade prediction** (grade from images). Its rule: Labelled grades. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 0.99 on the confounder. The naive comparison reports 0.1915 when the true effect is 0.0686, a bias of 0.1229.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0674 (bias -0.0013). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.085 against -0.001 for the bottom; 20.8% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0686 |
| Naive estimate | 0.1915 |
| Inverse-propensity estimate | 0.0674 |
| Uplift ranking AUC versus random | 0.0076 vs 0.0006 |
| Top versus bottom decile realised uplift | 0.085 vs -0.001 |

## 5. An edge case from the blueprint

**Safety-recalled products.** restocked by mistake. Planned response: Recall list check as hard constraint. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 36760 |
| `observational_rows` | 31598 |
| `holdout_rows` | 5162 |
| `true_ate` | 0.06863 |
| `naive_ate` | 0.19148 |
| `naive_bias` | 0.12285 |
| `ipw_ate` | 0.067369 |
| `ipw_bias` | -0.001261 |
| `holdout_ate` | 0.053865 |
| `holdout_balance_smd_x0` | -0.0062381 |
| `observational_balance_smd_x0` | 0.98726 |
| `t_learner_qini_auc` | 0.0076467 |
| `random_ranking_qini_auc` | 0.00058903 |
| `top_decile_realised_uplift` | 0.08498 |
| `bottom_decile_realised_uplift` | -0.0010204 |
| `share_predicted_negative` | 0.20845 |

</details>
