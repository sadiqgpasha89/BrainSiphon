# Price Elasticity Estimation (Causal): worked example

> Run on synthetic data with `uplift` engine, seed 33812, knobs {"n": 34940, "confound": 0.863, "holdout": 0.127}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate causal price elasticities per category and segment for pricing and promotion decisions using experiments and quasi-experiments.

**Constraints that shape the design.** Interpretable confidence intervals; Few randomised tests; Heterogeneity by segment

**Label in this use case.** For "Price Elasticity Estimation (Causal)": Estimate causal price elasticities per category and segment for pricing and promotion decisions using experiments and quasi-experiments. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Conditioning on post-treatment variables.

## 2. Choose the signals

Your strongest signal is **Randomised price cell assignment** (experiment arm ID). Its rule: Randomisation integrity. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 0.80 on the confounder. The naive comparison reports 0.1705 when the true effect is 0.0688, a bias of 0.1016.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0681 (bias -0.0007). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.171 against 0.053 for the bottom; 20.5% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0688 |
| Naive estimate | 0.1705 |
| Inverse-propensity estimate | 0.0681 |
| Uplift ranking AUC versus random | 0.0112 vs -0.0017 |
| Top versus bottom decile realised uplift | 0.171 vs 0.053 |

## 5. An edge case from the blueprint

**Competitor price reaction during test.** contaminated effect. Planned response: Competitor price covariates and shorter tests. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 34940 |
| `observational_rows` | 30520 |
| `holdout_rows` | 4420 |
| `true_ate` | 0.068824 |
| `naive_ate` | 0.17045 |
| `naive_bias` | 0.10163 |
| `ipw_ate` | 0.068137 |
| `ipw_bias` | -0.00068625 |
| `holdout_ate` | 0.10425 |
| `holdout_balance_smd_x0` | 0.011885 |
| `observational_balance_smd_x0` | 0.79997 |
| `t_learner_qini_auc` | 0.011195 |
| `random_ranking_qini_auc` | -0.0017355 |
| `top_decile_realised_uplift` | 0.17082 |
| `bottom_decile_realised_uplift` | 0.0527 |
| `share_predicted_negative` | 0.20498 |

</details>
