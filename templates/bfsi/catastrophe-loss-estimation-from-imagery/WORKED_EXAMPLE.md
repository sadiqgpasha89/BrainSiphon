# Catastrophe Loss Estimation from Imagery: worked example

> Run on synthetic data with `cv` engine, seed 47937, knobs {"n": 4240, "prevalence": 0.101}, in 1.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate insured damage within days of a catastrophe from aerial and satellite imagery combined with the policy book, so reserves and claims staffing are set early.

**Constraints that shape the design.** Estimates within 72 hours of imagery; Property-level results aggregated for reserving; Uncertainty reported

**Label in this use case.** For "Catastrophe Loss Estimation from Imagery": Estimate insured damage within days of a catastrophe from aerial and satellite imagery combined with the policy book, so reserves and claims staffing are set early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on one event type.

## 2. Choose the signals

Your strongest signal is **Footprint damage grade** (classifier over pre and post imagery per footprint). Its rule: Cloud and angle effects. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.948); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.747 and a false-positive rate of 5.8% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.948 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.747 |
| False-positive rate at a new site, contrast-augmented | 5.8% |

## 5. An edge case from the blueprint

**Cloud cover.** Cloud cover leaves no usable imagery for the affected area. Planned response: Fall back to hazard-only estimates and update when clear imagery arrives. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4240 |
| `train` | 1476 |
| `prevalence` | 0.098349 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.94781 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.74554 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.98813 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.94118 |
| `contrast_aug_lr.site_B.auc` | 0.74722 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.32143 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.36161 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.058237 |

</details>
