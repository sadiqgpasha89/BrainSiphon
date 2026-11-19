# Progress Monitoring from Drone Imagery: worked example

> Run on synthetic data with `cv` engine, seed 36611, knobs {"n": 3770, "prevalence": 0.092}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compare drone captures to the BIM or schedule to estimate progress by element and flag deviations.

**Constraints that shape the design.** Drone capture weekly at the agreed flight times; Accuracy reported for each element type; Privacy rules followed for people and neighbouring properties

**Label in this use case.** For "Progress Monitoring from Drone Imagery": Compare drone captures to the BIM or schedule to estimate progress by element and flag deviations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on one site hides failures on sites with different structures and materials.

## 2. Choose the signals

Your strongest signal is **Point cloud registration** (root-mean-square error of aligned points to BIM control points). Its rule: Drift over a large site needs control markers. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.941); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.753 and a false-positive rate of 4.8% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.941 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.753 |
| False-positive rate at a new site, contrast-augmented | 4.8% |

## 5. An edge case from the blueprint

**Occlusion.** Interior work or covered areas cannot be seen from the drone. Planned response: Combine with interior capture or site reports for hidden work. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 3770 |
| `train` | 1322 |
| `prevalence` | 0.097082 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.9411 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.73653 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.96957 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.85075 |
| `contrast_aug_lr.site_B.auc` | 0.75253 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.26347 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.25749 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.047647 |

</details>
