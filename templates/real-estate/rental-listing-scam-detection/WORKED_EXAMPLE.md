# Rental Listing Scam Detection: worked example

> Run on synthetic data with `tabular` engine, seed 14109, knobs {"n_entities": 2460, "positive_entity_rate": 0.042, "n_flash_sales": 4}, in 1.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect fake rental listings and advance-fee scams at posting time using text, images, price and account behaviour.

**Constraints that shape the design.** Decision within 80 ms when a listing is submitted; Legitimate listings are rarely blocked, with a stated false-block ceiling; Landlords can appeal a block and get a human review

**Label in this use case.** For "Rental Listing Scam Detection": Detect fake rental listings and advance-fee scams at posting time using text, images, price and account behaviour. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: The data contain reported scams only, which are the ones that victims noticed.

## 2. Choose the signals

Your strongest signal is **Image reuse** (perceptual-hash match against an index of images seen in other listings and on other sites). Its rule: Legitimate agents reuse images across their own listings. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.55% of the test period) and labels arrive weeks late. A model that always answers no would be 99.45% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.650 and finds 71.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.799 and 80.3%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.55% |
| Baseline PR-AUC | 0.650 |
| Baseline recall at 0.5% false positives | 71.7% |
| Challenger PR-AUC | 0.799 |
| Challenger recall at 0.5% false positives | 80.3% |

## 5. An edge case from the blueprint

**Legit low price.** A genuinely low price under rent control looks like a scam. Planned response: Add the rent-control context so legitimate low rents are not blocked. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 187571 |
| `positive_rate` | 0.0055392 |
| `test_rows` | 62728 |
| `test_positive_rate` | 0.0055159 |
| `baseline_lr.pr_auc` | 0.64999 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.71676 |
| `baseline_lr.brier` | 0.0065278 |
| `challenger_hgb.pr_auc` | 0.79856 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.80347 |
| `challenger_hgb.brier` | 0.0019867 |

</details>
