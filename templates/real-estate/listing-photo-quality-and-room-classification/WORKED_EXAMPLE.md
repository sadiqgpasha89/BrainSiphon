# Listing Photo Quality & Room Classification: worked example

> Run on synthetic data with `cv` engine, seed 39208, knobs {"n": 5240, "prevalence": 0.15}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent.

**Constraints that shape the design.** Under 80 ms per image at the 99th percentile so upload is not slowed; Room type and quality are descriptions of the photo, never judgements of people or their homes; Faces and number plates blurred before any image is stored or shown

**Label in this use case.** For "Listing Photo Quality & Room Classification": Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training mostly on professional photos hides failures on the phone pictures that most agents upload.

## 2. Choose the signals

Your strongest signal is **Room class probability** (softmax output of the vision model for each room type). Its rule: Rare rooms such as utility or study are under-represented, so check per-class recall. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.951); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.760 and a false-positive rate of 4.1% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.951 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.760 |
| False-positive rate at a new site, contrast-augmented | 4.1% |

## 5. An edge case from the blueprint

**Floor plans in the gallery.** A floor plan in the gallery is classed as a room photo. Planned response: Add a floor-plan class and route it to the plan viewer. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 5240 |
| `train` | 1847 |
| `prevalence` | 0.15382 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.95107 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.76546 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.97183 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.856 |
| `contrast_aug_lr.site_B.auc` | 0.76018 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.32732 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.29897 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.041176 |

</details>
