# Flaky Test Detection & Quarantine: worked example

> Run on synthetic data with `tabular` engine, seed 59611, knobs {"n_entities": 2210, "positive_entity_rate": 0.022, "n_flash_sales": 7}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify and quarantine flaky tests that waste CI time and erode trust, and prioritise fixes by impact.

**Constraints that shape the design.** Millions of test runs per day; Quarantine without hiding real failures; Owner assignment

**Label in this use case.** For "Flaky Test Detection & Quarantine": Identify and quarantine flaky tests that waste CI time and erode trust, and prioritise fixes by impact. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating all failures as flakiness.

## 2. Choose the signals

Your strongest signal is **Flip rate on same commit** (mixed outcomes on identical code). Its rule: Run dedup. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.21% of the test period) and labels arrive weeks late. A model that always answers no would be 99.79% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.567 and finds 62.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.557 and 63.6%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.21% |
| Baseline PR-AUC | 0.567 |
| Baseline recall at 0.5% false positives | 62.7% |
| Challenger PR-AUC | 0.557 |
| Challenger recall at 0.5% false positives | 63.6% |

## 5. An edge case from the blueprint

**Real regression looks flaky because it fails intermittently.** bug hidden by quarantine. Planned response: Quarantined tests still run and are tracked with deadlines. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 170272 |
| `positive_rate` | 0.002819 |
| `test_rows` | 56771 |
| `test_positive_rate` | 0.0020785 |
| `baseline_lr.pr_auc` | 0.56702 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.62712 |
| `baseline_lr.brier` | 0.0013756 |
| `challenger_hgb.pr_auc` | 0.5574 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.63559 |
| `challenger_hgb.brier` | 0.0013146 |

</details>
