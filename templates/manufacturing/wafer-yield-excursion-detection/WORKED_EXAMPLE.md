# Wafer Yield Excursion Detection: worked example

> Run on synthetic data with `uplift` engine, seed 74691, knobs {"n": 41940, "confound": 1.186, "holdout": 0.185}, in 0.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect and attribute yield excursions in semiconductor or electronics fabs to a tool, step or lot from inline metrology and fault data, so engineers contain them within hours.

**Constraints that shape the design.** Excursion detection within 4 hours of metrology; Tool and step attribution with evidence; Analysts confirm before tool hold

**Label in this use case.** For "Wafer Yield Excursion Detection": Detect and attribute yield excursions in semiconductor or electronics fabs to a tool, step or lot from inline metrology and fault data, so engineers contain them within hours. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Lot-level averages.

## 2. Choose the signals

Your strongest signal is **Tool commonality score** (share of bad wafers sharing a tool or chamber against the base rate). Its rule: Needs the wafer path. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.02 on the confounder. The naive comparison reports 0.1966 when the true effect is 0.0689, a bias of 0.1277.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0735 (bias 0.0046). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.124 against 0.000 for the bottom; 17.7% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0689 |
| Naive estimate | 0.1966 |
| Inverse-propensity estimate | 0.0735 |
| Uplift ranking AUC versus random | 0.0064 vs -0.0001 |
| Top versus bottom decile realised uplift | 0.124 vs 0.000 |

## 5. An edge case from the blueprint

**Several tools involved.** interaction effects. Planned response: Pairwise commonality and a human review. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 41940 |
| `observational_rows` | 34270 |
| `holdout_rows` | 7670 |
| `true_ate` | 0.068896 |
| `naive_ate` | 0.19663 |
| `naive_bias` | 0.12774 |
| `ipw_ate` | 0.073534 |
| `ipw_bias` | 0.0046372 |
| `holdout_ate` | 0.079 |
| `holdout_balance_smd_x0` | 0.0037756 |
| `observational_balance_smd_x0` | 1.0245 |
| `t_learner_qini_auc` | 0.0064028 |
| `random_ranking_qini_auc` | -9.336e-05 |
| `top_decile_realised_uplift` | 0.12444 |
| `bottom_decile_realised_uplift` | 0.00015661 |
| `share_predicted_negative` | 0.17666 |

</details>
