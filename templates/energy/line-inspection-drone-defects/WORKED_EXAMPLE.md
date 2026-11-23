# Line Inspection Drone Defect Detection: worked example

> Run on synthetic data with `cv` engine, seed 75311, knobs {"n": 4160, "prevalence": 0.091}, in 0.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect damaged insulators, corroded hardware, cracked crossarms and missing parts in drone and helicopter imagery of lines and poles so crews target the real defects.

**Constraints that shape the design.** Defect list per structure with the image evidence; Recall above 90% for critical defects; Inspector confirms before a work order

**Label in this use case.** For "Line Inspection Drone Defect Detection": Detect damaged insulators, corroded hardware, cracked crossarms and missing parts in drone and helicopter imagery of lines and poles so crews target the real defects. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using detection count as priority.

## 2. Choose the signals

Your strongest signal is **Defect class scores** (model score per defect type). Its rule: Calibrated per class. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.946); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.769 and a false-positive rate of 4.4% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.946 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.769 |
| False-positive rate at a new site, contrast-augmented | 4.4% |

## 5. An edge case from the blueprint

**Poor image.** glare hides the component. Planned response: Quality filter and a re-fly request. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4160 |
| `train` | 1450 |
| `prevalence` | 0.089183 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.94637 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.74713 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.96273 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.875 |
| `contrast_aug_lr.site_B.auc` | 0.76906 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.33908 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.3046 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.044071 |

</details>
