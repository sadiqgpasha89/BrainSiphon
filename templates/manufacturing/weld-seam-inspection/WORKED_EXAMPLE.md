# Weld Seam Inspection: worked example

> Run on synthetic data with `cv` engine, seed 24617, knobs {"n": 5050, "prevalence": 0.132}, in 1.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted.

**Constraints that shape the design.** Weld judged within 5 s of completion; Escape rate under 0.2% for structural welds; Process signals stored with each weld

**Label in this use case.** For "Weld Seam Inspection": Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using visual judgement as strength labels.

## 2. Choose the signals

Your strongest signal is **Bead geometry score** (width, height and continuity from the image). Its rule: Camera calibration needed. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.948); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.753 and a false-positive rate of 4.6% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.948 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.753 |
| False-positive rate at a new site, contrast-augmented | 4.6% |

## 5. An edge case from the blueprint

**Electrode wear.** quality drifts slowly. Planned response: Wear count features and a tip dress trigger. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 5050 |
| `train` | 1775 |
| `prevalence` | 0.13287 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.94803 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.7459 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.9785 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.92708 |
| `contrast_aug_lr.site_B.auc` | 0.75322 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.38525 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.36339 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.045982 |

</details>
