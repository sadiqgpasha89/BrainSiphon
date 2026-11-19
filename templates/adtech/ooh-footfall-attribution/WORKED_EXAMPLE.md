# Out-of-Home Footfall Attribution: worked example

> Run on synthetic data with `uplift` engine, seed 33825, knobs {"n": 33590, "confound": 1.007, "holdout": 0.124}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Attribute store visits to out-of-home ad exposure using mobility data and control groups with privacy safeguards.

**Constraints that shape the design.** Location privacy; Panel bias; Exposure estimation error

**Label in this use case.** For "Out-of-Home Footfall Attribution": Attribute store visits to out-of-home ad exposure using mobility data and control groups with privacy safeguards. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: No control group.

## 2. Choose the signals

Your strongest signal is **Visibility-weighted exposure** (line-of-sight and dwell). Its rule: Geometry. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 0.91 on the confounder. The naive comparison reports 0.1709 when the true effect is 0.0688, a bias of 0.1021.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0640 (bias -0.0048). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.194 against -0.049 for the bottom; 21.3% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0688 |
| Naive estimate | 0.1709 |
| Inverse-propensity estimate | 0.0640 |
| Uplift ranking AUC versus random | 0.0106 vs -0.0008 |
| Top versus bottom decile realised uplift | 0.194 vs -0.049 |

## 5. An edge case from the blueprint

**Panel under-represents certain groups.** under-represented groups in the mobility panel bias the measured lift. Planned response: Weighting to census. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 33590 |
| `observational_rows` | 29410 |
| `holdout_rows` | 4180 |
| `true_ate` | 0.068791 |
| `naive_ate` | 0.17092 |
| `naive_bias` | 0.10213 |
| `ipw_ate` | 0.064009 |
| `ipw_bias` | -0.0047815 |
| `holdout_ate` | 0.075343 |
| `holdout_balance_smd_x0` | -0.053311 |
| `observational_balance_smd_x0` | 0.90879 |
| `t_learner_qini_auc` | 0.010567 |
| `random_ranking_qini_auc` | -0.00075527 |
| `top_decile_realised_uplift` | 0.19429 |
| `bottom_decile_realised_uplift` | -0.049431 |
| `share_predicted_negative` | 0.21292 |

</details>
