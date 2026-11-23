# Wildfire Smoke Detection from Cameras: worked example

> Run on synthetic data with `cv` engine, seed 6913, knobs {"n": 4600, "prevalence": 0.138}, in 0.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect early smoke plumes in tower camera feeds and alert fire dispatchers with the image evidence so crews arrive while fires are small.

**Constraints that shape the design.** Alert with an image loop within 60 s of first visible smoke; A person confirms before dispatch; False alarms under 2 per camera per week

**Label in this use case.** For "Wildfire Smoke Detection from Cameras": Detect early smoke plumes in tower camera feeds and alert fire dispatchers with the image evidence so crews arrive while fires are small. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automatic dispatch.

## 2. Choose the signals

Your strongest signal is **Smoke probability by region** (model score on image regions). Its rule: Calibrated. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.956); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.739 and a false-positive rate of 4.9% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.956 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.739 |
| False-positive rate at a new site, contrast-augmented | 4.9% |

## 5. An edge case from the blueprint

**Fog and dust.** the model sees false plumes. Planned response: Weather-aware models and time confirmation. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4600 |
| `train` | 1652 |
| `prevalence` | 0.14522 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.95617 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.77994 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.96756 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.87288 |
| `contrast_aug_lr.site_B.auc` | 0.73858 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.29773 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.28803 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.048718 |

</details>
