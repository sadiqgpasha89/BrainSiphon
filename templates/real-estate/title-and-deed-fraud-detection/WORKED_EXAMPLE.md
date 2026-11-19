# Title & Deed Fraud Detection: worked example

> Run on synthetic data with `tabular` engine, seed 76304, knobs {"n_entities": 2710, "positive_entity_rate": 0.023, "n_flash_sales": 8}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect forged deeds, owner impersonation and suspicious transfers before closing or recording.

**Constraints that shape the design.** A human investigator reviews every flagged case before action; Every alert shows the evidence behind it; False positives kept low so legitimate transfers are not delayed

**Label in this use case.** For "Title & Deed Fraud Detection": Detect forged deeds, owner impersonation and suspicious transfers before closing or recording. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled cases and many undetected ones make the recall unknowable.

## 2. Choose the signals

Your strongest signal is **Ownership change speed** (days between the first filing and the transfer to a new owner or a loan against the property). Its rule: Legitimate rushed sales exist, so combine with other signals. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.22% of the test period) and labels arrive weeks late. A model that always answers no would be 99.78% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.550 and finds 74.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.658 and 78.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.22% |
| Baseline PR-AUC | 0.550 |
| Baseline recall at 0.5% false positives | 74.8% |
| Challenger PR-AUC | 0.658 |
| Challenger recall at 0.5% false positives | 78.1% |

## 5. An edge case from the blueprint

**Elderly owners.** Elderly owners are targeted by fraudsters and are often victims. Planned response: Give protective alerts to owners flagged at higher risk and add review before recording. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 204468 |
| `positive_rate` | 0.0030274 |
| `test_rows` | 68674 |
| `test_positive_rate` | 0.0021988 |
| `baseline_lr.pr_auc` | 0.55046 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.74834 |
| `baseline_lr.brier` | 0.0019222 |
| `challenger_hgb.pr_auc` | 0.65838 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.78146 |
| `challenger_hgb.brier` | 0.0011379 |

</details>
