# Move-Out Damage Assessment from Photos: worked example

> Run on synthetic data with `cv` engine, seed 24602, knobs {"n": 4500, "prevalence": 0.084}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions.

**Constraints that shape the design.** A tenant can dispute any deduction with the same evidence the manager sees; Normal wear is separated from damage using a documented rule; Move-in and move-out photos are matched by room and view

**Label in this use case.** For "Move-Out Damage Assessment from Photos": Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Posed photos taken by a careful inspector are cleaner than tenants' own pictures.

## 2. Choose the signals

Your strongest signal is **Change detection** (pixel-level difference between aligned move-in and move-out photos after exposure normalisation). Its rule: Lighting changes look like damage, so normalise first. In the starter, the closest executable idea is **local contrast**: how strongly a region stands out from its neighbourhood. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A model trained at one site looks excellent there (AUC 1.000) and degrades at another (AUC 0.952); the threshold chosen at the first site then fires on 100.0% of negatives at the second.

## 4. Baseline against the stronger design

Augmenting for the site's contrast changes the new-site result to AUC 0.766 and a false-positive rate of 5.2% at the old threshold.

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.952 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.766 |
| False-positive rate at a new site, contrast-augmented | 5.2% |

## 5. An edge case from the blueprint

**Different lighting.** Different lighting between move-in and move-out photos looks like damage. Planned response: Normalise exposure and compare structure instead of raw colour. Write the test that replays this case through your pipeline before you tune anything.

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
| `images` | 4500 |
| `train` | 1628 |
| `prevalence` | 0.087111 |
| `pixels_lr.site_A_heldout.auc` | 1 |
| `pixels_lr.site_A_heldout.sens_at_95_spec` | 1 |
| `pixels_lr.site_B.auc` | 0.95229 |
| `pixels_lr.site_B.sens_at_95_spec` | 0.79188 |
| `pixels_lr.site_B_at_A_threshold.sensitivity` | 1 |
| `pixels_lr.site_B_at_A_threshold.false_positive_rate` | 1 |
| `contrast_aug_lr.site_A_heldout.auc` | 0.96997 |
| `contrast_aug_lr.site_A_heldout.sens_at_95_spec` | 0.93333 |
| `contrast_aug_lr.site_B.auc` | 0.76573 |
| `contrast_aug_lr.site_B.sens_at_95_spec` | 0.31472 |
| `contrast_aug_lr.site_B_at_A_threshold.sensitivity` | 0.3198 |
| `contrast_aug_lr.site_B_at_A_threshold.false_positive_rate` | 0.052444 |

</details>
