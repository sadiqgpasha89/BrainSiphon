# Proactive Outage Notification & Credits: worked example

> Run on synthetic data with `tabular` engine, seed 9582, knobs {"n_entities": 1850, "positive_entity_rate": 0.023, "n_flash_sales": 4}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Notify affected customers of outages in their own channel with accurate restoration estimates and calculate goodwill credits within policy, so contacts during incidents fall.

**Constraints that shape the design.** Customer lists derived from verified service impact; Messages reviewed from templates and never promise unverified times; Credits follow a published policy and a cost cap

**Label in this use case.** For "Proactive Outage Notification & Credits": Notify affected customers of outages in their own channel with accurate restoration estimates and calculate goodwill credits within policy, so contacts during incidents fall. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Notifying by postcode.

## 2. Choose the signals

Your strongest signal is **Impact membership** (verified link between the customer and the affected elements). Its rule: Join to live topology. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.30% of the test period) and labels arrive weeks late. A model that always answers no would be 99.70% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.865 and finds 90.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.850 and 90.0%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.30% |
| Baseline PR-AUC | 0.865 |
| Baseline recall at 0.5% false positives | 90.7% |
| Challenger PR-AUC | 0.850 |
| Challenger recall at 0.5% false positives | 90.0% |

## 5. An edge case from the blueprint

**Estimate wrong.** restoration slips. Planned response: Update the message with a new range and apologise once. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 136895 |
| `positive_rate` | 0.0038351 |
| `test_rows` | 46764 |
| `test_positive_rate` | 0.0029938 |
| `baseline_lr.pr_auc` | 0.8646 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.90714 |
| `baseline_lr.brier` | 0.00082196 |
| `challenger_hgb.pr_auc` | 0.85041 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.9 |
| `challenger_hgb.brier` | 0.00081247 |

</details>
