# Substation Thermal Imaging Anomaly Detection: worked example

> Run on synthetic data with `cv` engine, seed 7557, knobs {"n": 4840, "prevalence": 0.158}, in 0.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find hot spots on connectors, breakers and transformers in thermal images and fixed camera feeds, rank them by temperature rise and load, and schedule repairs.

**Constraints that shape the design.** Hot spot list with temperature rise relative to similar parts; Load-adjusted severity; Technician confirms before outage planning

**Label in this use case.** For "Substation Thermal Imaging Anomaly Detection": Find hot spots on connectors, breakers and transformers in thermal images and fixed camera feeds, rank them by temperature rise and load, and schedule repairs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Absolute temperature thresholds.

## 2. Choose the signals

Your strongest signal is **Temperature difference between phases** (difference between similar parts). Its rule: From the image. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.945); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.762 and a false-positive rate of 5.4% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.945 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.762 |
| False-positive rate at a new site, contrast-augmented | 5.4% |

## 5. An edge case from the blueprint

**Reflection.** sun glare causes a false hot spot. Planned response: Reflection filters and angle metadata. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4840 |
| `train` | 1647 |
| `prevalence` | 0.16157 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.94483 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.74693 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.98215 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.92623 |
| `contrast_aug_lr.site_B.auc` | 0.76247 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.33907 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.36855 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.054028 |

</details>
