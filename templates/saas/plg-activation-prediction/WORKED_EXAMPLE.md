# Product-Led Growth Activation Prediction: worked example

> Run on synthetic data with `uplift` engine, seed 65569, knobs {"n": 44290, "confound": 1.54, "holdout": 0.189}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which new signups will activate and convert to paid, and trigger in-product guidance or sales assist for those on the edge.

**Constraints that shape the design.** Real-time within sessions; Privacy; Low-friction nudges

**Label in this use case.** For "Product-Led Growth Activation Prediction": Predict which new signups will activate and convert to paid, and trigger in-product guidance or sales assist for those on the edge. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Non-random nudge assignments in training.

## 2. Choose the signals

Your strongest signal is **Key-action completion in first session** (whether the aha action occurred). Its rule: Event definitions. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.28 on the confounder. The naive comparison reports 0.2247 when the true effect is 0.0694, a bias of 0.1553.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0770 (bias 0.0076). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.091 against -0.050 for the bottom; 15.4% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0694 |
| Naive estimate | 0.2247 |
| Inverse-propensity estimate | 0.0770 |
| Uplift ranking AUC versus random | 0.0099 vs 0.0001 |
| Top versus bottom decile realised uplift | 0.091 vs -0.050 |

## 5. An edge case from the blueprint

**Instrumentation change breaks the activation event.** model sees zero activations. Planned response: Event-contract tests and activation-rate monitors. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 44290 |
| `observational_rows` | 35996 |
| `holdout_rows` | 8294 |
| `true_ate` | 0.069403 |
| `naive_ate` | 0.22469 |
| `naive_bias` | 0.15528 |
| `ipw_ate` | 0.076964 |
| `ipw_bias` | 0.007561 |
| `holdout_ate` | 0.067744 |
| `holdout_balance_smd_x0` | -0.0057045 |
| `observational_balance_smd_x0` | 1.2806 |
| `t_learner_qini_auc` | 0.0099163 |
| `random_ranking_qini_auc` | 8.2176e-05 |
| `top_decile_realised_uplift` | 0.090761 |
| `bottom_decile_realised_uplift` | -0.05046 |
| `share_predicted_negative` | 0.15373 |

</details>
