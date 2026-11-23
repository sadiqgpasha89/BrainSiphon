# Public Safety Tool Bias and Error Audit: worked example

> Run on synthetic data with `tabular` engine, seed 76542, knobs {"n_entities": 1890, "positive_entity_rate": 0.042, "n_flash_sales": 6}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Audit each deployed tool for error rates, outcome gaps and drift across groups and areas, test with held-out reviews and report results to an oversight board with the power to pause a tool.

**Constraints that shape the design.** Every deployed tool audited at least every 6 months; Group data used for audit only and never in decisions; Oversight board can pause a tool

**Label in this use case.** For "Public Safety Tool Bias and Error Audit": Audit each deployed tool for error rates, outcome gaps and drift across groups and areas, test with held-out reviews and report results to an oversight board with the power to pause a tool. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Overall accuracy only.

## 2. Choose the signals

Your strongest signal is **Error rate by group** (false positives and negatives). Its rule: From reviewed samples. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.43% of the test period) and labels arrive weeks late. A model that always answers no would be 99.57% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.742 and finds 75.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.739 and 74.9%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.43% |
| Baseline PR-AUC | 0.742 |
| Baseline recall at 0.5% false positives | 75.4% |
| Challenger PR-AUC | 0.739 |
| Challenger recall at 0.5% false positives | 74.9% |

## 5. An edge case from the blueprint

**Small groups.** metrics are noisy. Planned response: Confidence intervals and pooled periods. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 145681 |
| `positive_rate` | 0.0057798 |
| `test_rows` | 48041 |
| `test_positive_rate` | 0.0043088 |
| `baseline_lr.pr_auc` | 0.74218 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.75362 |
| `baseline_lr.brier` | 0.0020688 |
| `challenger_hgb.pr_auc` | 0.73858 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.74879 |
| `challenger_hgb.brier` | 0.0018969 |

</details>
