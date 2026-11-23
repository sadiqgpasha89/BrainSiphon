# Emergency Alert Geo-Targeting: worked example

> Run on synthetic data with `tabular` engine, seed 61288, knobs {"n_entities": 1930, "positive_entity_rate": 0.042, "n_flash_sales": 6}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Help alert authors draw alert areas that cover the hazard and people at risk without over-alerting, using hazard forecasts and population data.

**Constraints that shape the design.** The authorised officer approves every alert; Areas shown with the share of people covered and over-alerted; Alert text from approved templates

**Label in this use case.** For "Emergency Alert Geo-Targeting": Help alert authors draw alert areas that cover the hazard and people at risk without over-alerting, using hazard forecasts and population data. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Largest-area alerts.

## 2. Choose the signals

Your strongest signal is **Hazard extent forecast** (forecast footprint with uncertainty). Its rule: From hazard models. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.66% of the test period) and labels arrive weeks late. A model that always answers no would be 99.34% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.641 and finds 71.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.718 and 73.2%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.66% |
| Baseline PR-AUC | 0.641 |
| Baseline recall at 0.5% false positives | 71.3% |
| Challenger PR-AUC | 0.718 |
| Challenger recall at 0.5% false positives | 73.2% |

## 5. An edge case from the blueprint

**Moving hazard.** the extent changes. Planned response: Update prompts and revised alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 148386 |
| `positive_rate` | 0.0055261 |
| `test_rows` | 49949 |
| `test_positive_rate` | 0.0065667 |
| `baseline_lr.pr_auc` | 0.64065 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.71341 |
| `baseline_lr.brier` | 0.0032982 |
| `challenger_hgb.pr_auc` | 0.71776 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.73171 |
| `challenger_hgb.brier` | 0.0029931 |

</details>
