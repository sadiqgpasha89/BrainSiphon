# Subscription & Identity Fraud at Onboarding: worked example

> Run on synthetic data with `tabular` engine, seed 68449, knobs {"n_entities": 2810, "positive_entity_rate": 0.024, "n_flash_sales": 8}, in 4.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score new subscription and device-financing applications for identity and bust-out fraud so fraudsters are stopped at the door and genuine customers onboard quickly.

**Constraints that shape the design.** Decision within 80 ms; Document and identity checks follow the local KYC rules; Decline reasons available for appeals

**Label in this use case.** For "Subscription & Identity Fraud at Onboarding": Score new subscription and device-financing applications for identity and bust-out fraud so fraudsters are stopped at the door and genuine customers onboard quickly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on early cancellations.

## 2. Choose the signals

Your strongest signal is **Identity attribute reuse** (number of applications sharing the phone, address or device). Its rule: Use hashed identifiers. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.39% of the test period) and labels arrive weeks late. A model that always answers no would be 99.61% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.737 and finds 81.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.729 and 76.0%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.39% |
| Baseline PR-AUC | 0.737 |
| Baseline recall at 0.5% false positives | 81.4% |
| Challenger PR-AUC | 0.729 |
| Challenger recall at 0.5% false positives | 76.0% |

## 5. An edge case from the blueprint

**Thin-file genuine customer.** very few signals are available. Planned response: Offer alternatives such as a deposit or a lower tier. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 212746 |
| `positive_rate` | 0.0030647 |
| `test_rows` | 69746 |
| `test_positive_rate` | 0.0038855 |
| `baseline_lr.pr_auc` | 0.73732 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.814 |
| `baseline_lr.brier` | 0.0017133 |
| `challenger_hgb.pr_auc` | 0.72905 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.76015 |
| `challenger_hgb.brier` | 0.0017683 |

</details>
