# Vision-Guided Bin Picking: worked example

> Run on synthetic data with `cv` engine, seed 65383, knobs {"n": 4390, "prevalence": 0.104}, in 0.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Locate and grasp randomly placed parts in bins using 3D vision so robot cells can feed machines without precise fixturing.

**Constraints that shape the design.** Pose estimate within 80 ms; Grasp success above 98%; Collision checks before each motion

**Label in this use case.** For "Vision-Guided Bin Picking": Locate and grasp randomly placed parts in bins using 3D vision so robot cells can feed machines without precise fixturing. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on annotation only.

## 2. Choose the signals

Your strongest signal is **Pose estimate confidence** (confidence of the part pose). Its rule: Calibrated. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.943); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.739 and a false-positive rate of 7.3% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.943 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.739 |
| False-positive rate at a new site, contrast-augmented | 7.3% |

## 5. An edge case from the blueprint

**Reflective parts.** depth data is noisy. Planned response: Multi-exposure capture and filters. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4390 |
| `train` | 1509 |
| `prevalence` | 0.10091 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.94277 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.73684 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.96548 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.875 |
| `contrast_aug_lr.site_B.auc` | 0.73852 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.33772 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.37719 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.072609 |

</details>
