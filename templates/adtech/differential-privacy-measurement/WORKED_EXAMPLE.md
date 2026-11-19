# Differentially Private Ad Measurement: worked example

> Run on synthetic data with `uplift` engine, seed 49211, knobs {"n": 36060, "confound": 1.55, "holdout": 0.125}, in 0.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Provide campaign reach and conversion reporting with formal differential-privacy guarantees and useful accuracy.

**Constraints that shape the design.** Epsilon budget accounting; Utility for small campaigns; Consistent repeated queries

**Label in this use case.** For "Differentially Private Ad Measurement": Provide campaign reach and conversion reporting with formal differential-privacy guarantees and useful accuracy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating utility without privacy composition.

## 2. Choose the signals

Your strongest signal is **Sensitivity bound** (per-user contribution cap). Its rule: Clipping. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.28 on the confounder. The naive comparison reports 0.2162 when the true effect is 0.0687, a bias of 0.1475.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0757 (bias 0.0070). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.138 against 0.005 for the bottom; 20.0% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0687 |
| Naive estimate | 0.2162 |
| Inverse-propensity estimate | 0.0757 |
| Uplift ranking AUC versus random | 0.0105 vs 0.0059 |
| Top versus bottom decile realised uplift | 0.138 vs 0.005 |

## 5. An edge case from the blueprint

**Analysts re-query with tiny variations.** budget exhausted or leakage. Planned response: Query caching and budget enforcement. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 36060 |
| `observational_rows` | 31599 |
| `holdout_rows` | 4461 |
| `true_ate` | 0.068685 |
| `naive_ate` | 0.21617 |
| `naive_bias` | 0.14749 |
| `ipw_ate` | 0.075655 |
| `ipw_bias` | 0.0069707 |
| `holdout_ate` | 0.079625 |
| `holdout_balance_smd_x0` | -0.018857 |
| `observational_balance_smd_x0` | 1.2784 |
| `t_learner_qini_auc` | 0.010502 |
| `random_ranking_qini_auc` | 0.0058597 |
| `top_decile_realised_uplift` | 0.13829 |
| `bottom_decile_realised_uplift` | 0.0049053 |
| `share_predicted_negative` | 0.2004 |

</details>
