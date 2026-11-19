# Uplift Modelling for Campaigns: worked example

> Run on synthetic data with `uplift` engine, seed 31085, knobs {"n": 32350, "confound": 1.6, "holdout": 0.121}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Target ads or offers only to users whose conversion probability rises because of the treatment, to maximise incremental conversions.

**Constraints that shape the design.** Randomised control required; Budget; Consent

**Label in this use case.** For "Uplift Modelling for Campaigns": Target ads or offers only to users whose conversion probability rises because of the treatment, to maximise incremental conversions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on non-randomised past targeting.

## 2. Choose the signals

Your strongest signal is **Treatment propensity (known)** (randomisation probability). Its rule: Design. In the starter, the closest executable idea is **confounder (x0)**: drives both who is treated and the outcome. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised 1.30 on the confounder. The naive comparison reports 0.2180 when the true effect is 0.0687, a bias of 0.1493.

## 4. Baseline against the stronger design

Inverse-propensity weighting reports 0.0806 (bias 0.0119). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains 0.026 against -0.025 for the bottom; 21.4% are predicted to be harmed.

| Result | Value |
|---|---|
| True average effect | 0.0687 |
| Naive estimate | 0.2180 |
| Inverse-propensity estimate | 0.0806 |
| Uplift ranking AUC versus random | 0.0048 vs 0.0022 |
| Top versus bottom decile realised uplift | 0.026 vs -0.025 |

## 5. An edge case from the blueprint

**Spillover between treated and control users.** uplift is underestimated. Planned response: Cluster randomisation where interference exists. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 32350 |
| `observational_rows` | 28471 |
| `holdout_rows` | 3879 |
| `true_ate` | 0.068716 |
| `naive_ate` | 0.21799 |
| `naive_bias` | 0.14928 |
| `ipw_ate` | 0.080588 |
| `ipw_bias` | 0.011872 |
| `holdout_ate` | 0.053773 |
| `holdout_balance_smd_x0` | 0.017084 |
| `observational_balance_smd_x0` | 1.296 |
| `t_learner_qini_auc` | 0.004846 |
| `random_ranking_qini_auc` | 0.0021775 |
| `top_decile_realised_uplift` | 0.025986 |
| `bottom_decile_realised_uplift` | -0.02455 |
| `share_predicted_negative` | 0.21371 |

</details>
