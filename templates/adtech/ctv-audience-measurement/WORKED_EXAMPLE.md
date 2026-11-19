# Cross-Platform Audience Measurement (TV + Digital): worked example

> Run on synthetic data with `uplift` engine, seed 62454, knobs {"n": 40530, "confound": 0.979, "holdout": 0.183}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate deduplicated reach and frequency across linear TV, CTV and digital by fusing panel and census data.

**Constraints that shape the design.** Panel representativeness; Census coverage gaps; Methodology audits

**Label in this use case.** For "Cross-Platform Audience Measurement (TV + Digital)": Estimate deduplicated reach and frequency across linear TV, CTV and digital by fusing panel and census data. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Panel evaluated on itself.

## 2. Choose the signals

Your strongest signal is **Panel reach curves** (frequency distributions). Its rule: Sampling. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 0.89 on the confounder. The naive comparison reports 0.1831 when the true effect is 0.0691, a bias of 0.1140.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0683 (bias -0.0009). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.107 against -0.107 for the bottom; 19.1% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0691 |
| Naive estimate | 0.1831 |
| Inverse-propensity estimate | 0.0683 |
| Uplift ranking AUC versus random | 0.0121 vs -0.0012 |
| Top versus bottom decile realised uplift | 0.107 vs -0.107 |

## 5. An edge case from the blueprint

**Panel attrition changes composition.** panel members drop out unevenly so the sample composition drifts and biases estimates. Planned response: Reweighting and recruitment tracking. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 40530 |
| `observational_rows` | 33134 |
| `holdout_rows` | 7396 |
| `true_ate` | 0.06913 |
| `naive_ate` | 0.1831 |
| `naive_bias` | 0.11397 |
| `ipw_ate` | 0.068254 |
| `ipw_bias` | -0.00087617 |
| `holdout_ate` | 0.062387 |
| `holdout_balance_smd_x0` | 0.0085832 |
| `observational_balance_smd_x0` | 0.88603 |
| `t_learner_qini_auc` | 0.01208 |
| `random_ranking_qini_auc` | -0.0011795 |
| `top_decile_realised_uplift` | 0.10667 |
| `bottom_decile_realised_uplift` | -0.10706 |
| `share_predicted_negative` | 0.19091 |

</details>
