# CAD and Drawing Similarity Search: worked example

> Run on synthetic data with `cv` engine, seed 31579, knobs {"n": 5390, "prevalence": 0.094}, in 1.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find similar existing parts and drawings from a new sketch, model or description so engineers reuse designs and avoid creating duplicates.

**Constraints that shape the design.** Search within 3 s over 5M drawings; Access control follows the PLM permissions; Results show the similarity reason

**Label in this use case.** For "CAD and Drawing Similarity Search": Find similar existing parts and drawings from a new sketch, model or description so engineers reuse designs and avoid creating duplicates. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Shape-only matching.

## 2. Choose the signals

Your strongest signal is **Shape embedding similarity** (embedding of the 3D shape or drawing). Its rule: Normalise scale. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.939); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.757 and a false-positive rate of 6.0% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.939 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.757 |
| False-positive rate at a new site, contrast-augmented | 6.0% |

## 5. An edge case from the blueprint

**Poor sketch.** the query is ambiguous. Planned response: Ask for attributes and show nearest examples. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 5390 |
| `train` | 1938 |
| `prevalence` | 0.098145 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.93898 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.73307 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.96342 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.8125 |
| `contrast_aug_lr.site_B.auc` | 0.7571 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.31873 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.33865 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.060276 |

</details>
