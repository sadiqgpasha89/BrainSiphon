# Merchant Risk Scoring at Onboarding: worked example

> Run on synthetic data with `tabular` engine, seed 49997, knobs {"n_entities": 2340, "positive_entity_rate": 0.024, "n_flash_sales": 5}, in 1.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score new merchants for fraud, regulatory and credit risk during onboarding, auto-approving the safe majority within a minute.

**Constraints that shape the design.** Prohibited-business screening; Beneficial-owner verification; Decision in under 60 s for 80%

**Label in this use case.** For "Merchant Risk Scoring at Onboarding": Score new merchants for fraud, regulatory and credit risk during onboarding, auto-approving the safe majority within a minute. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes only observed for approved merchants.

## 2. Choose the signals

Your strongest signal is **MCC-site mismatch** (classifier probability that the site belongs to the declared MCC). Its rule: Crawl at onboarding time and freeze. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.38% of the test period) and labels arrive weeks late. A model that always answers no would be 99.62% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.798 and finds 84.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.814 and 82.2%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.38% |
| Baseline PR-AUC | 0.798 |
| Baseline recall at 0.5% false positives | 84.9% |
| Challenger PR-AUC | 0.814 |
| Challenger recall at 0.5% false positives | 82.2% |

## 5. An edge case from the blueprint

**Website behind login.** crawler sees nothing. Planned response: Request demo credentials and treat missing content as risk feature. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 176681 |
| `positive_rate` | 0.0036506 |
| `test_rows` | 58849 |
| `test_positive_rate` | 0.0038233 |
| `baseline_lr.pr_auc` | 0.79759 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.84889 |
| `baseline_lr.brier` | 0.0013969 |
| `challenger_hgb.pr_auc` | 0.81435 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.82222 |
| `challenger_hgb.brier` | 0.001181 |

</details>
