# Collections Propensity & Next-Best-Action: worked example

> Run on synthetic data with `uplift` engine, seed 51196, knobs {"n": 36240, "confound": 1.145, "holdout": 0.138}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules.

**Constraints that shape the design.** Contact-frequency and time-of-day regulations; Hardship customers excluded; Daily capacity of dialer agents

**Label in this use case.** For "Collections Propensity & Next-Best-Action": Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on all contacted customers without a holdout.

## 2. Choose the signals

Your strongest signal is **Promise-to-pay reliability** (share of past promises honoured). Its rule: Promise outcome known only after follow-up date. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.01 on the confounder. The naive comparison reports 0.1973 when the true effect is 0.0700, a bias of 0.1272.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0733 (bias 0.0033). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.128 against -0.031 for the bottom; 15.0% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0700 |
| Naive estimate | 0.1973 |
| Inverse-propensity estimate | 0.0733 |
| Uplift ranking AUC versus random | 0.0130 vs -0.0002 |
| Top versus bottom decile realised uplift | 0.128 vs -0.031 |

## 5. An edge case from the blueprint

**Hardship flag arrives late.** contact made to protected customer. Planned response: Real-time suppression list check at dispatch. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 36240 |
| `observational_rows` | 31229 |
| `holdout_rows` | 5011 |
| `true_ate` | 0.070046 |
| `naive_ate` | 0.19728 |
| `naive_bias` | 0.12723 |
| `ipw_ate` | 0.073349 |
| `ipw_bias` | 0.0033028 |
| `holdout_ate` | 0.076247 |
| `holdout_balance_smd_x0` | 0.045018 |
| `observational_balance_smd_x0` | 1.0061 |
| `t_learner_qini_auc` | 0.013025 |
| `random_ranking_qini_auc` | -0.00015668 |
| `top_decile_realised_uplift` | 0.12804 |
| `bottom_decile_realised_uplift` | -0.030685 |
| `share_predicted_negative` | 0.15007 |

</details>
