# Disaster Damage Assessment from Satellite Imagery: worked example

> Run on synthetic data with `cv` engine, seed 83121, knobs {"n": 3850, "prevalence": 0.153}, in 0.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Map damaged buildings, roads and flooding from satellite and aerial images after disasters so responders prioritise rescue and supplies.

**Constraints that shape the design.** Damage maps within 12 hours of imagery; Hazards flagged for immediate human review; Field teams verify

**Label in this use case.** For "Disaster Damage Assessment from Satellite Imagery": Map damaged buildings, roads and flooding from satellite and aerial images after disasters so responders prioritise rescue and supplies. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counts as priority.

## 2. Choose the signals

Your strongest signal is **Damage class scores** (model scores per building). Its rule: Calibrated. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.932); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.719 and a false-positive rate of 4.9% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.932 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.719 |
| False-positive rate at a new site, contrast-augmented | 4.9% |

## 5. An edge case from the blueprint

**Cloud cover.** the area cannot be seen. Planned response: Radar and aircraft fallbacks. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Split by physical item and by site, recalibrate the threshold per site, and measure on a site the model has never seen before sign-off.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `images` | 3850 |
| `train` | 1342 |
| `prevalence` | 0.14883 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.93217 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.71329 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.97443 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.92857 |
| `contrast_aug_lr.site_B.auc` | 0.71912 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.26224 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.26224 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.048884 |

</details>
