# Invalid Traffic (IVT) Detection: worked example

> Run on synthetic data with `tabular` engine, seed 9505, knobs {"n_entities": 2000, "positive_entity_rate": 0.028, "n_flash_sales": 4}, in 1.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify bot, hijacked-device and click-farm traffic across impressions and clicks before billing and bidding on it.

**Constraints that shape the design.** Pre-bid decision in 5 ms; Post-bid refunds; MRC accreditation standards

**Label in this use case.** For "Invalid Traffic (IVT) Detection": Identify bot, hijacked-device and click-farm traffic across impressions and clicks before billing and bidding on it. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from detected fraud.

## 2. Choose the signals

Your strongest signal is **IP and device request velocity** (requests per minute per entity). Its rule: Window before request. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.41% of the test period) and labels arrive weeks late. A model that always answers no would be 99.59% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.391 and finds 42.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.728 and 76.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.41% |
| Baseline PR-AUC | 0.391 |
| Baseline recall at 0.5% false positives | 42.3% |
| Challenger PR-AUC | 0.728 |
| Challenger recall at 0.5% false positives | 76.5% |

## 5. An edge case from the blueprint

**Legitimate traffic spike from viral content.** flagged as bot flood. Planned response: Publisher-baseline and content-event features. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 154311 |
| `positive_rate` | 0.0036679 |
| `test_rows` | 51529 |
| `test_positive_rate` | 0.0041336 |
| `baseline_lr.pr_auc` | 0.39143 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.42254 |
| `baseline_lr.brier` | 0.0034234 |
| `challenger_hgb.pr_auc` | 0.7284 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.76526 |
| `challenger_hgb.brier` | 0.0021894 |

</details>
