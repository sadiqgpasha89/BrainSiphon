# Infrastructure Defect Detection: worked example

> Run on synthetic data with `cv` engine, seed 54410, knobs {"n": 4020, "prevalence": 0.115}, in 0.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect cracks, spalling, corrosion and leaks in images of bridges, tunnels and pipes and rank defects by severity for inspection engineers to confirm and schedule.

**Constraints that shape the design.** Inspector confirms every defect before work orders; Defect recall above 95% at the review rate; Findings show location and measurements

**Label in this use case.** For "Infrastructure Defect Detection": Detect cracks, spalling, corrosion and leaks in images of bridges, tunnels and pipes and rank defects by severity for inspection engineers to confirm and schedule. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model labels as truth.

## 2. Choose the signals

Your strongest signal is **Defect class and extent** (crack width and area). Its rule: From a vision model. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.947); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.784 and a false-positive rate of 4.0% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.947 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.784 |
| False-positive rate at a new site, contrast-augmented | 4.0% |

## 5. An edge case from the blueprint

**Dirt and stains.** marks look like cracks. Planned response: Hard negative training. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4020 |
| `train` | 1421 |
| `prevalence` | 0.11617 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.94706 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.72653 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.98026 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.84932 |
| `contrast_aug_lr.site_B.auc` | 0.78448 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.36735 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.33878 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.039632 |

</details>
