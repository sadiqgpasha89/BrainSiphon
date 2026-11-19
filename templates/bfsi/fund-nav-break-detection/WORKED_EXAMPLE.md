# Fund NAV Break Detection: worked example

> Run on synthetic data with `tabular` engine, seed 10421, knobs {"n_entities": 2990, "positive_entity_rate": 0.028, "n_flash_sales": 6}, in 1.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect errors in daily fund net asset value before publication so administrators fix pricing and accrual errors first.

**Constraints that shape the design.** Check completes within 30 minutes of the pricing cut-off; Every flag names the likely line item; Tolerance bands set by fund type

**Label in this use case.** For "Fund NAV Break Detection": Detect errors in daily fund net asset value before publication so administrators fix pricing and accrual errors first. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only for breaks found later.

## 2. Choose the signals

Your strongest signal is **Unexplained NAV residual** (NAV change minus attributed price, flow and accrual effects). Its rule: Needs correct holdings and FX. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.24% of the test period) and labels arrive weeks late. A model that always answers no would be 99.76% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.517 and finds 58.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.573 and 66.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.24% |
| Baseline PR-AUC | 0.517 |
| Baseline recall at 0.5% false positives | 58.3% |
| Challenger PR-AUC | 0.573 |
| Challenger recall at 0.5% false positives | 66.7% |

## 5. An edge case from the blueprint

**Large subscription.** A large subscription changes the NAV through flows and looks like a pricing error. Planned response: Attribute the NAV change to flows before testing for a break. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 223998 |
| `positive_rate` | 0.0036474 |
| `test_rows` | 74879 |
| `test_positive_rate` | 0.0024039 |
| `baseline_lr.pr_auc` | 0.51726 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.58333 |
| `baseline_lr.brier` | 0.0021297 |
| `challenger_hgb.pr_auc` | 0.5734 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.66667 |
| `challenger_hgb.brier` | 0.0014128 |

</details>
