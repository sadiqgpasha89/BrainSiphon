# Marketplace Seller Fraud Detection: worked example

> Run on synthetic data with `tabular` engine, seed 28993, knobs {"n_entities": 2780, "positive_entity_rate": 0.021, "n_flash_sales": 4}, in 3.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect fraudulent or high-risk sellers at registration and early lifecycle to stop scams, counterfeits and non-delivery.

**Constraints that shape the design.** Onboarding SLA hours not days; Legal KYB requirements; Appeals

**Label in this use case.** For "Marketplace Seller Fraud Detection": Detect fraudulent or high-risk sellers at registration and early lifecycle to stop scams, counterfeits and non-delivery. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes only observed for approved sellers.

## 2. Choose the signals

Your strongest signal is **Payout-account sharing** (sellers sharing bank accounts or wallets). Its rule: Hashed identifiers. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.24% of the test period) and labels arrive weeks late. A model that always answers no would be 99.76% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.539 and finds 70.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.689 and 79.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.24% |
| Baseline PR-AUC | 0.539 |
| Baseline recall at 0.5% false positives | 70.1% |
| Challenger PR-AUC | 0.689 |
| Challenger recall at 0.5% false positives | 79.6% |

## 5. An edge case from the blueprint

**Legitimate agency managing many sellers.** flagged as linked network. Planned response: Business relationship registry. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 210824 |
| `positive_rate` | 0.0028317 |
| `test_rows` | 69813 |
| `test_positive_rate` | 0.0023921 |
| `baseline_lr.pr_auc` | 0.53943 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.7006 |
| `baseline_lr.brier` | 0.0014375 |
| `challenger_hgb.pr_auc` | 0.68868 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.79641 |
| `challenger_hgb.brier` | 0.0011266 |

</details>
