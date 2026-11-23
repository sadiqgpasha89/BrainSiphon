# Early-Stage Cost Estimation: worked example

> Run on synthetic data with `tabular` engine, seed 8563, knobs {"n_entities": 1940, "positive_entity_rate": 0.034, "n_flash_sales": 8}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate project cost ranges from early scope and design parameters using past projects, so owners and planners understand likely cost before detailed design.

**Constraints that shape the design.** Estimates shown as ranges with drivers; Estimators review before sharing; Past project data normalised for inflation and location

**Label in this use case.** For "Early-Stage Cost Estimation": Estimate project cost ranges from early scope and design parameters using past projects, so owners and planners understand likely cost before detailed design. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Early budget as label.

## 2. Choose the signals

Your strongest signal is **Scope drivers** (size, type and complexity). Its rule: From the brief. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.32% of the test period) and labels arrive weeks late. A model that always answers no would be 99.68% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.432 and finds 71.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.697 and 73.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.32% |
| Baseline PR-AUC | 0.432 |
| Baseline recall at 0.5% false positives | 71.2% |
| Challenger PR-AUC | 0.697 |
| Challenger recall at 0.5% false positives | 73.1% |

## 5. An edge case from the blueprint

**Novel project type.** no similar projects exist. Planned response: Wide ranges and analogue search. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 150107 |
| `positive_rate` | 0.0045634 |
| `test_rows` | 50654 |
| `test_positive_rate` | 0.0031587 |
| `baseline_lr.pr_auc` | 0.43179 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.7125 |
| `baseline_lr.brier` | 0.0069226 |
| `challenger_hgb.pr_auc` | 0.6972 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.73125 |
| `challenger_hgb.brier` | 0.0014698 |

</details>
