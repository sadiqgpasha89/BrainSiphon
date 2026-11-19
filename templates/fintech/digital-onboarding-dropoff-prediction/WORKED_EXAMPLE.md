# Digital Onboarding Drop-off Prediction & Intervention: worked example

> Run on synthetic data with `uplift` engine, seed 24481, knobs {"n": 38650, "confound": 1.481, "holdout": 0.176}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict mid-funnel abandonment during account opening and intervene (nudge, simplified step, assisted help) to lift completion.

**Constraints that shape the design.** No pressure tactics; Consent for outreach; Decision under 80 ms per screen

**Label in this use case.** For "Digital Onboarding Drop-off Prediction & Intervention": Predict mid-funnel abandonment during account opening and intervene (nudge, simplified step, assisted help) to lift completion. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Intervention data from non-random triggers.

## 2. Choose the signals

Your strongest signal is **Step dwell time vs peers** (z-score of dwell on current step). Its rule: Peer baseline per device type. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.25 on the confounder. The naive comparison reports 0.2143 when the true effect is 0.0690, a bias of 0.1453.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0764 (bias 0.0073). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.126 against 0.019 for the bottom; 21.4% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0690 |
| Naive estimate | 0.2143 |
| Inverse-propensity estimate | 0.0764 |
| Uplift ranking AUC versus random | 0.0072 vs -0.0016 |
| Top versus bottom decile realised uplift | 0.126 vs 0.019 |

## 5. An edge case from the blueprint

**App release changes flow.** features shift instantly. Planned response: Release-aware feature normalisation and rollback checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 38650 |
| `observational_rows` | 31799 |
| `holdout_rows` | 6851 |
| `true_ate` | 0.069027 |
| `naive_ate` | 0.21435 |
| `naive_bias` | 0.14532 |
| `ipw_ate` | 0.076372 |
| `ipw_bias` | 0.007345 |
| `holdout_ate` | 0.069772 |
| `holdout_balance_smd_x0` | -0.0032051 |
| `observational_balance_smd_x0` | 1.2515 |
| `t_learner_qini_auc` | 0.0071683 |
| `random_ranking_qini_auc` | -0.0016287 |
| `top_decile_realised_uplift` | 0.12649 |
| `bottom_decile_realised_uplift` | 0.018809 |
| `share_predicted_negative` | 0.21442 |

</details>
