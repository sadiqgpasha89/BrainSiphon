# Bayesian Marketing Mix Modelling: worked example

> Run on synthetic data with `uplift` engine, seed 15239, knobs {"n": 44590, "confound": 0.819, "holdout": 0.165}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets.

**Constraints that shape the design.** Aggregate weekly data; Priors from experiments; Multicollinearity

**Label in this use case.** For "Bayesian Marketing Mix Modelling": Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Overfitting with many parameters on short history.

## 2. Choose the signals

Your strongest signal is **Adstock decay parameter** (geometric carryover per channel). Its rule: Prior. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 0.76 on the confounder. The naive comparison reports 0.1737 when the true effect is 0.0692, a bias of 0.1044.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0673 (bias -0.0019). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.154 against -0.048 for the bottom; 18.7% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0692 |
| Naive estimate | 0.1737 |
| Inverse-propensity estimate | 0.0673 |
| Uplift ranking AUC versus random | 0.0106 vs -0.0003 |
| Top versus bottom decile realised uplift | 0.154 vs -0.048 |

## 5. An edge case from the blueprint

**Spend moves in lockstep across channels.** channel effects unidentifiable. Planned response: Staggered tests and informative priors. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 44590 |
| `observational_rows` | 37223 |
| `holdout_rows` | 7367 |
| `true_ate` | 0.069236 |
| `naive_ate` | 0.17367 |
| `naive_bias` | 0.10443 |
| `ipw_ate` | 0.067338 |
| `ipw_bias` | -0.0018978 |
| `holdout_ate` | 0.06878 |
| `holdout_balance_smd_x0` | -0.03642 |
| `observational_balance_smd_x0` | 0.76192 |
| `t_learner_qini_auc` | 0.010628 |
| `random_ranking_qini_auc` | -0.00028997 |
| `top_decile_realised_uplift` | 0.15396 |
| `bottom_decile_realised_uplift` | -0.04816 |
| `share_predicted_negative` | 0.18746 |

</details>
