# OEE Loss Attribution: worked example

> Run on synthetic data with `uplift` engine, seed 33534, knobs {"n": 44590, "confound": 1.233, "holdout": 0.161}, in 0.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Attribute lost production time and output to causes such as stops, speed loss and quality so improvement effort targets the largest loss buckets.

**Constraints that shape the design.** Loss definitions follow the plant standard; Attribution reconciles to total lost hours; Per-line and per-shift views

**Label in this use case.** For "OEE Loss Attribution": Attribute lost production time and output to causes such as stops, speed loss and quality so improvement effort targets the largest loss buckets. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Operator-logged stops only.

## 2. Choose the signals

Your strongest signal is **Stop duration and frequency** (number and length of stops by cause). Its rule: From machine states. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.09 on the confounder. The naive comparison reports 0.2074 when the true effect is 0.0689, a bias of 0.1386.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0754 (bias 0.0065). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.129 against -0.027 for the bottom; 17.6% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0689 |
| Naive estimate | 0.2074 |
| Inverse-propensity estimate | 0.0754 |
| Uplift ranking AUC versus random | 0.0103 vs -0.0009 |
| Top versus bottom decile realised uplift | 0.129 vs -0.027 |

## 5. An edge case from the blueprint

**Micro-stops.** many stops under 30 seconds. Planned response: Capture automatically with a minimum threshold. Write the test that replays this case through your pipeline before you tune anything.

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
| `observational_rows` | 37358 |
| `holdout_rows` | 7232 |
| `true_ate` | 0.068881 |
| `naive_ate` | 0.20745 |
| `naive_bias` | 0.13856 |
| `ipw_ate` | 0.075414 |
| `ipw_bias` | 0.0065332 |
| `holdout_ate` | 0.05757 |
| `holdout_balance_smd_x0` | -0.024465 |
| `observational_balance_smd_x0` | 1.0902 |
| `t_learner_qini_auc` | 0.010345 |
| `random_ranking_qini_auc` | -0.00094252 |
| `top_decile_realised_uplift` | 0.1291 |
| `bottom_decile_realised_uplift` | -0.026617 |
| `share_predicted_negative` | 0.17644 |

</details>
