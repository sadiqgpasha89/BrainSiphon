# Money Mule Account Detection: worked example

> Run on synthetic data with `tabular` engine, seed 19588, knobs {"n_entities": 2980, "positive_entity_rate": 0.04, "n_flash_sales": 4}, in 3.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify accounts used to move proceeds of fraud (mules) before cash-out, using flow shape and onboarding signals.

**Constraints that shape the design.** Case disposition within 48h; Customer-friendly account holds; Fair treatment of students and new migrants

**Label in this use case.** For "Money Mule Account Detection": Identify accounts used to move proceeds of fraud (mules) before cash-out, using flow shape and onboarding signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Positives only from accounts already investigated.

## 2. Choose the signals

Your strongest signal is **Dwell time of funds** (median seconds between credit and debit). Its rule: Compute on settled transactions. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.58% of the test period) and labels arrive weeks late. A model that always answers no would be 99.42% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.588 and finds 77.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.839 and 86.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.58% |
| Baseline PR-AUC | 0.588 |
| Baseline recall at 0.5% false positives | 77.4% |
| Challenger PR-AUC | 0.839 |
| Challenger recall at 0.5% false positives | 86.4% |

## 5. An edge case from the blueprint

**Genuine marketplace seller receives many payments.** flagged as mule. Planned response: Seller verification feature and merchant-like profile. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 235433 |
| `positive_rate` | 0.0049781 |
| `test_rows` | 77859 |
| `test_positive_rate` | 0.0058439 |
| `baseline_lr.pr_auc` | 0.58838 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.77363 |
| `baseline_lr.brier` | 0.0066186 |
| `challenger_hgb.pr_auc` | 0.83922 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.86374 |
| `challenger_hgb.brier` | 0.0018622 |

</details>
