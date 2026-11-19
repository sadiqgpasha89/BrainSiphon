# Marketplace UGC Moderation: worked example

> Run on synthetic data with `cv` engine, seed 45111, knobs {"n": 4420, "prevalence": 0.135}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Block prohibited listings, images and messages at submission while minimising wrongful removals.

**Constraints that shape the design.** Policy per country; Appeals within 48 hours; Multi-modal content

**Label in this use case.** For "Marketplace UGC Moderation": Block prohibited listings, images and messages at submission while minimising wrongful removals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from reviewer disagreement unresolved.

## 2. Choose the signals

Your strongest signal is **Multi-label policy scores** (per-policy probabilities). Its rule: Calibrated per region. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.951); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.763 and a false-positive rate of 5.9% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.951 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.763 |
| False-positive rate at a new site, contrast-augmented | 5.9% |

## 5. An edge case from the blueprint

**New scam trend.** a novel scam pattern is not in training data so recall drops until retraining. Planned response: Rapid labelling pipeline and rule hotfix channel. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4420 |
| `train` | 1525 |
| `prevalence` | 0.12217 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.95071 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.75458 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.98332 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.92 |
| `contrast_aug_lr.site_B.auc` | 0.7631 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.28205 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.30403 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.058794 |

</details>
