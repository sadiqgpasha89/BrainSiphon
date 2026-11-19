# Modelled Conversions under Privacy Constraints: worked example

> Run on synthetic data with `uplift` engine, seed 65305, knobs {"n": 44180, "confound": 1.258, "holdout": 0.194}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate unobservable conversions from aggregate and consented signals to keep measurement accurate as identifiers disappear.

**Constraints that shape the design.** Privacy thresholds; Calibration against consented panel; Transparency about modelled vs observed

**Label in this use case.** For "Modelled Conversions under Privacy Constraints": Estimate unobservable conversions from aggregate and consented signals to keep measurement accurate as identifiers disappear. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Consented users differ from non-consented.

## 2. Choose the signals

Your strongest signal is **Consented-user conversion rate** (rate in observable population). Its rule: Sampling. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.10 on the confounder. The naive comparison reports 0.2047 when the true effect is 0.0695, a bias of 0.1352.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0694 (bias -0.0001). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.162 against -0.041 for the bottom; 16.9% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0695 |
| Naive estimate | 0.2047 |
| Inverse-propensity estimate | 0.0694 |
| Uplift ranking AUC versus random | 0.0082 vs -0.0020 |
| Top versus bottom decile realised uplift | 0.162 vs -0.041 |

## 5. An edge case from the blueprint

**Consent mix shifts after banner redesign.** a consent banner redesign changes who consents, biasing the model trained on consented traffic. Planned response: Consent-aware reweighting and monitoring. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 44180 |
| `observational_rows` | 35740 |
| `holdout_rows` | 8440 |
| `true_ate` | 0.06945 |
| `naive_ate` | 0.20467 |
| `naive_bias` | 0.13522 |
| `ipw_ate` | 0.069367 |
| `ipw_bias` | -8.3282e-05 |
| `holdout_ate` | 0.070142 |
| `holdout_balance_smd_x0` | 0.012899 |
| `observational_balance_smd_x0` | 1.1027 |
| `t_learner_qini_auc` | 0.0082385 |
| `random_ranking_qini_auc` | -0.0020123 |
| `top_decile_realised_uplift` | 0.16218 |
| `bottom_decile_realised_uplift` | -0.041387 |
| `share_predicted_negative` | 0.16943 |

</details>
