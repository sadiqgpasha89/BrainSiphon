# Shelf Monitoring & Planogram Compliance: worked example

> Run on synthetic data with `cv` engine, seed 85133, knobs {"n": 5350, "prevalence": 0.096}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales.

**Constraints that shape the design.** Works on phone and robot images; New SKUs weekly; Edge inference in store

**Label in this use case.** For "Shelf Monitoring & Planogram Compliance": Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation on clean shelf photos.

## 2. Choose the signals

Your strongest signal is **Facing count vs planogram** (detected facings minus planned facings). Its rule: Accurate planogram version. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.939); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.767 and a false-positive rate of 4.6% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.939 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.767 |
| False-positive rate at a new site, contrast-augmented | 4.6% |

## 5. An edge case from the blueprint

**Promotional displays off planogram.** false non-compliance. Planned response: Promo-calendar-aware planogram versions. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 5350 |
| `train` | 1895 |
| `prevalence` | 0.09514 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.93888 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.76518 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.97494 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.90909 |
| `contrast_aug_lr.site_B.auc` | 0.76748 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.33198 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.30769 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.04591 |

</details>
