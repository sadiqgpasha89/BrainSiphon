# Tax Compliance Outreach Prioritisation: worked example

> Run on synthetic data with `uplift` engine, seed 82896, knobs {"n": 42180, "confound": 0.985, "holdout": 0.192}, in 0.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose who receives reminders, letters or help with late filing and payment so outreach improves compliance at the lowest cost, with support first and enforcement only through officers.

**Constraints that shape the design.** Outreach is a nudge or an offer of help; Enforcement decisions by officers; Experiments to confirm what works

**Label in this use case.** For "Tax Compliance Outreach Prioritisation": Choose who receives reminders, letters or help with late filing and payment so outreach improves compliance at the lowest cost, with support first and enforcement only through officers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Risk scores without tests.

## 2. Choose the signals

Your strongest signal is **Past filing and payment behaviour** (timeliness of filings and payments). Its rule: From tax records. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 0.89 on the confounder. The naive comparison reports 0.1842 when the true effect is 0.0690, a bias of 0.1152.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0730 (bias 0.0040). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.109 against -0.028 for the bottom; 24.0% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0690 |
| Naive estimate | 0.1842 |
| Inverse-propensity estimate | 0.0730 |
| Uplift ranking AUC versus random | 0.0066 vs 0.0004 |
| Top versus bottom decile realised uplift | 0.109 vs -0.028 |

## 5. An edge case from the blueprint

**Message fatigue.** the response rate falls over time. Planned response: Frequency limits and rotation. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 42180 |
| `observational_rows` | 33947 |
| `holdout_rows` | 8233 |
| `true_ate` | 0.068994 |
| `naive_ate` | 0.18422 |
| `naive_bias` | 0.11523 |
| `ipw_ate` | 0.073001 |
| `ipw_bias` | 0.004007 |
| `holdout_ate` | 0.065769 |
| `holdout_balance_smd_x0` | -0.0010665 |
| `observational_balance_smd_x0` | 0.89358 |
| `t_learner_qini_auc` | 0.0065908 |
| `random_ranking_qini_auc` | 0.00042332 |
| `top_decile_realised_uplift` | 0.10921 |
| `bottom_decile_realised_uplift` | -0.028324 |
| `share_predicted_negative` | 0.24037 |

</details>
