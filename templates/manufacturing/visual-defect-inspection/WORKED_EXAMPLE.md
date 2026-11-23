# Visual Defect Inspection: worked example

> Run on synthetic data with `cv` engine, seed 84259, knobs {"n": 3520, "prevalence": 0.096}, in 0.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships.

**Constraints that shape the design.** Decision within 80 ms at line speed; Escape rate below 0.5% at a false reject rate under 2%; Every reject keeps its image and model version for traceability

**Label in this use case.** For "Visual Defect Inspection": Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on operator rejects as truth.

## 2. Choose the signals

Your strongest signal is **Defect probability map** (model score per image region). Its rule: Calibrate per defect class. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.945); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.758 and a false-positive rate of 4.2% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.945 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.758 |
| False-positive rate at a new site, contrast-augmented | 4.2% |

## 5. An edge case from the blueprint

**Lighting change.** brightness shifts and false rejects rise. Planned response: Lighting statistics monitored and automatic recalibration alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 3520 |
| `train` | 1243 |
| `prevalence` | 0.096875 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.94542 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.72785 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.95936 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.85714 |
| `contrast_aug_lr.site_B.auc` | 0.75774 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.31646 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.29747 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.042236 |

</details>
