# Freight Fraud & Cargo Theft Detection: worked example

> Run on synthetic data with `tabular` engine, seed 2575, knobs {"n_entities": 1840, "positive_entity_rate": 0.02, "n_flash_sales": 4}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect fictitious pickups, identity-theft carriers and strategic cargo theft before loads are tendered or while in transit.

**Constraints that shape the design.** Decision before tender in seconds; Carrier onboarding checks; Legal evidence

**Label in this use case.** For "Freight Fraud & Cargo Theft Detection": Detect fictitious pickups, identity-theft carriers and strategic cargo theft before loads are tendered or while in transit. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled thefts with bias to detected cases.

## 2. Choose the signals

Your strongest signal is **Contact-detail change velocity** (changes to phone, email and bank in 30 days). Its rule: Event-time snapshots. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.32% of the test period) and labels arrive weeks late. A model that always answers no would be 99.68% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.647 and finds 78.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.719 and 78.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.32% |
| Baseline PR-AUC | 0.647 |
| Baseline recall at 0.5% false positives | 78.5% |
| Challenger PR-AUC | 0.719 |
| Challenger recall at 0.5% false positives | 78.5% |

## 5. An edge case from the blueprint

**Legitimate carrier updates bank details.** false takeover alarm. Planned response: Out-of-band verification workflow and risk tiering. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 143063 |
| `positive_rate` | 0.002796 |
| `test_rows` | 47045 |
| `test_positive_rate` | 0.0031672 |
| `baseline_lr.pr_auc` | 0.64673 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78523 |
| `baseline_lr.brier` | 0.0015294 |
| `challenger_hgb.pr_auc` | 0.71884 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.78523 |
| `challenger_hgb.brier` | 0.0018974 |

</details>
