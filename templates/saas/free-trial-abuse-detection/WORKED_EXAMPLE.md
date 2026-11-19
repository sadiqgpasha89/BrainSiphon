# Free-Trial & Promo Abuse Detection: worked example

> Run on synthetic data with `tabular` engine, seed 20046, knobs {"n_entities": 2010, "positive_entity_rate": 0.039, "n_flash_sales": 5}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect repeat trials, referral fraud and credit farming at signup to protect revenue without blocking genuine users.

**Constraints that shape the design.** Decision at signup within 50 ms; Low friction; Privacy

**Label in this use case.** For "Free-Trial & Promo Abuse Detection": Detect repeat trials, referral fraud and credit farming at signup to protect revenue without blocking genuine users. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from caught abuse.

## 2. Choose the signals

Your strongest signal is **Device and payment linkage count** (accounts sharing device or card). Its rule: Hashing. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.63% of the test period) and labels arrive weeks late. A model that always answers no would be 99.37% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.768 and finds 82.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.862 and 86.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.63% |
| Baseline PR-AUC | 0.768 |
| Baseline recall at 0.5% false positives | 82.1% |
| Challenger PR-AUC | 0.862 |
| Challenger recall at 0.5% false positives | 86.6% |

## 5. An edge case from the blueprint

**Families or teams share a device.** false repeat-trial flags. Planned response: Business email and workspace signals. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Expect lower numbers and a different first failure on real data. Keep the chronological split, the matured-label rule and the future-truncation test, and replace the synthetic generator with your extract.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 156488 |
| `positive_rate` | 0.0053998 |
| `test_rows` | 53050 |
| `test_positive_rate` | 0.0063148 |
| `baseline_lr.pr_auc` | 0.76753 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.8209 |
| `baseline_lr.brier` | 0.0029346 |
| `challenger_hgb.pr_auc` | 0.86151 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.86567 |
| `challenger_hgb.brier` | 0.0017698 |

</details>
