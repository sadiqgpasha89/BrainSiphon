# Roof Condition from Aerial Imagery: worked example

> Run on synthetic data with `cv` engine, seed 64315, knobs {"n": 4080, "prevalence": 0.113}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify roof material, age and damage from aerial imagery for underwriting, maintenance and valuation.

**Constraints that shape the design.** The date of the imagery is shown with every grade; Results are for a single property and never a neighbourhood average; A person reviews any adverse decision based on the grade

**Label in this use case.** For "Roof Condition from Aerial Imagery": Classify roof material, age and damage from aerial imagery for underwriting, maintenance and valuation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: The date of the imagery rarely matches the date of the decision, so errors rise in real use.

## 2. Choose the signals

Your strongest signal is **Roof segmentation** (intersection-over-union of the predicted roof mask with labelled outlines). Its rule: Shadows and tree edges confuse the mask. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.945); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.742 and a false-positive rate of 5.9% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.945 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.742 |
| False-positive rate at a new site, contrast-augmented | 5.9% |

## 5. An edge case from the blueprint

**Tree cover.** Tree cover hides part of the roof so condition cannot be graded. Planned response: Flag the occlusion and request another image or an inspection. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4080 |
| `train` | 1459 |
| `prevalence` | 0.10711 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.9452 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.76077 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.97254 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.90769 |
| `contrast_aug_lr.site_B.auc` | 0.74213 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.30622 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.33971 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.059417 |

</details>
