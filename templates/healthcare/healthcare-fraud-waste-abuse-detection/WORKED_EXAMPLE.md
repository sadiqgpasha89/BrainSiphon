# Healthcare Fraud, Waste & Abuse Detection: worked example

> Run on synthetic data with `tabular` engine, seed 3838, knobs {"n_entities": 2050, "positive_entity_rate": 0.024, "n_flash_sales": 7}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect upcoding, phantom billing and kickback networks in provider claims to reduce improper payments and focus audits.

**Constraints that shape the design.** Due-process for providers; Audit evidence; Peer-group comparisons

**Label in this use case.** For "Healthcare Fraud, Waste & Abuse Detection": Detect upcoding, phantom billing and kickback networks in provider claims to reduce improper payments and focus audits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Positives only from audited providers.

## 2. Choose the signals

Your strongest signal is **E/M code distribution skew** (share of high-level visit codes vs peers). Its rule: Peer baseline per specialty. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.14% of the test period) and labels arrive weeks late. A model that always answers no would be 99.86% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.534 and finds 74.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.509 and 74.3%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.14% |
| Baseline PR-AUC | 0.534 |
| Baseline recall at 0.5% false positives | 74.3% |
| Challenger PR-AUC | 0.509 |
| Challenger recall at 0.5% false positives | 74.3% |

## 5. An edge case from the blueprint

**New billing guidance changes code norms.** peer baselines shift. Planned response: Guidance-aware re-baselining and effective-date flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 153792 |
| `positive_rate` | 0.0035568 |
| `test_rows` | 50791 |
| `test_positive_rate` | 0.0013782 |
| `baseline_lr.pr_auc` | 0.53406 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.74286 |
| `baseline_lr.brier` | 0.001002 |
| `challenger_hgb.pr_auc` | 0.50896 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.74286 |
| `challenger_hgb.brier` | 0.00096603 |

</details>
