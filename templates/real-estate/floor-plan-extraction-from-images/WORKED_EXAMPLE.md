# Floor-Plan Extraction from Images: worked example

> Run on synthetic data with `cv` engine, seed 75090, knobs {"n": 4760, "prevalence": 0.157}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours.

**Constraints that shape the design.** Total area within 3 percent of the stated area on supported plans; Every extracted room carries a label and a confidence; Both metric and imperial dimensions read correctly

**Label in this use case.** For "Floor-Plan Extraction from Images": Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on clean CAD exports hides failures on the hand-drawn and scanned plans that most listings contain.

## 2. Choose the signals

Your strongest signal is **Wall segmentation** (intersection-over-union of the predicted wall mask against labelled plans). Its rule: Clutter such as furniture symbols and hatching confuses the mask, so evaluate per drawing style. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.945); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.774 and a false-positive rate of 5.1% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.945 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.774 |
| False-positive rate at a new site, contrast-augmented | 5.1% |

## 5. An edge case from the blueprint

**Hand-drawn plans.** Hand-drawn plans are irregular and the wall detector fails. Planned response: Detect low-confidence geometry and send the plan to the correction tool. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4760 |
| `train` | 1679 |
| `prevalence` | 0.14538 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.94506 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.73494 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.96857 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.85 |
| `contrast_aug_lr.site_B.auc` | 0.77435 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.31325 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.3253 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.051485 |

</details>
