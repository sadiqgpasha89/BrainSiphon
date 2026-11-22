# Provider Directory Accuracy Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 45838, knobs {"n_entities": 1980, "positive_entity_rate": 0.02, "n_flash_sales": 7}, in 9.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely.

**Constraints that shape the design.** Outputs are field-level accuracy risks and never replace attestation; The provider or data steward validates corrections before publication; Claims and encounter signals are used only where lawful and minimised

**Label in this use case.** For "Provider Directory Accuracy Prediction": Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on records where change implies error.

## 2. Choose the signals

Your strongest signal is **Field age since verification** (days since the field was last confirmed from a trusted source). Its rule: Use verification events. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.25% of the test period) and labels arrive weeks late. A model that always answers no would be 99.75% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.774 and finds 81.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.742 and 82.1%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.25% |
| Baseline PR-AUC | 0.774 |
| Baseline recall at 0.5% false positives | 81.3% |
| Challenger PR-AUC | 0.742 |
| Challenger recall at 0.5% false positives | 82.1% |

## 5. An edge case from the blueprint

**Provider moves practice.** old and new location both appear active. Planned response: Location lifecycle states with an end date. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 152796 |
| `positive_rate` | 0.0027291 |
| `test_rows` | 50198 |
| `test_positive_rate` | 0.0024503 |
| `baseline_lr.pr_auc` | 0.77388 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.81301 |
| `baseline_lr.brier` | 0.00094783 |
| `challenger_hgb.pr_auc` | 0.74155 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.82114 |
| `challenger_hgb.brier` | 0.0010415 |

</details>
