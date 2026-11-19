# Federated Learning Across Hospitals: worked example

> Run on synthetic data with `tabular` engine, seed 76776, knobs {"n_entities": 2300, "positive_entity_rate": 0.023, "n_flash_sales": 7}, in 1.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Train shared clinical models across hospitals without centralising patient data, handling heterogeneity and governance.

**Constraints that shape the design.** Data stays on site; Differential privacy budgets; Non-IID data

**Label in this use case.** For "Federated Learning Across Hospitals": Train shared clinical models across hospitals without centralising patient data, handling heterogeneity and governance. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on pooled data only.

## 2. Choose the signals

Your strongest signal is **Per-site data distribution summaries** (label and feature statistics). Its rule: Privacy-safe summaries. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.34% of the test period) and labels arrive weeks late. A model that always answers no would be 99.66% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.717 and finds 75.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.792 and 84.2%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.34% |
| Baseline PR-AUC | 0.717 |
| Baseline recall at 0.5% false positives | 75.2% |
| Challenger PR-AUC | 0.792 |
| Challenger recall at 0.5% false positives | 84.2% |

## 5. An edge case from the blueprint

**One site has label shift.** global model biased. Planned response: Site weighting and personalisation. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 181990 |
| `positive_rate` | 0.0032255 |
| `test_rows` | 60123 |
| `test_positive_rate` | 0.0033598 |
| `baseline_lr.pr_auc` | 0.71737 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.75248 |
| `baseline_lr.brier` | 0.0015591 |
| `challenger_hgb.pr_auc` | 0.79228 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84158 |
| `challenger_hgb.brier` | 0.0013375 |

</details>
