# Expansion & Upsell Propensity: worked example

> Run on synthetic data with `tabular` engine, seed 11306, knobs {"n_entities": 2930, "positive_entity_rate": 0.025, "n_flash_sales": 5}, in 1.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify accounts ready to expand seats or tiers, and the right product to propose, to prioritise sales effort.

**Constraints that shape the design.** Sales capacity; Fairness in territory allocation; Explainable signals

**Label in this use case.** For "Expansion & Upsell Propensity": Identify accounts ready to expand seats or tiers, and the right product to propose, to prioritise sales effort. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using signals recorded after sales engagement.

## 2. Choose the signals

Your strongest signal is **Seat utilisation near cap** (active seats over licensed). Its rule: Billing. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.46% of the test period) and labels arrive weeks late. A model that always answers no would be 99.54% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.792 and finds 84.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.814 and 82.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.46% |
| Baseline PR-AUC | 0.792 |
| Baseline recall at 0.5% false positives | 84.2% |
| Challenger PR-AUC | 0.814 |
| Challenger recall at 0.5% false positives | 82.4% |

## 5. An edge case from the blueprint

**Free pilots look like expansion.** wasted sales calls. Planned response: Contract-state features and pilot flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 219850 |
| `positive_rate` | 0.0037798 |
| `test_rows` | 73120 |
| `test_positive_rate` | 0.0045815 |
| `baseline_lr.pr_auc` | 0.79239 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.84176 |
| `baseline_lr.brier` | 0.0016038 |
| `challenger_hgb.pr_auc` | 0.81445 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.82388 |
| `challenger_hgb.brier` | 0.0015215 |

</details>
