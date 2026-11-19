# Synthetic Identity Fraud Detection: worked example

> Run on synthetic data with `tabular` engine, seed 21158, knobs {"n_entities": 2360, "positive_entity_rate": 0.039, "n_flash_sales": 5}, in 2.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Catch fabricated identities built from real and fake attributes at application time, before they bust out on credit lines.

**Constraints that shape the design.** Decision within 80 ms at application; FCRA adverse-action reasons; Consortium data usage limits

**Label in this use case.** For "Synthetic Identity Fraud Detection": Catch fabricated identities built from real and fake attributes at application time, before they bust out on credit lines. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Cluster members split across train and test leak the ring.

## 2. Choose the signals

Your strongest signal is **Attribute sharing degree** (number of distinct applicants sharing each identity attribute). Its rule: Count only applicants before the current one. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.58% of the test period) and labels arrive weeks late. A model that always answers no would be 99.42% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.701 and finds 74.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.767 and 80.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.58% |
| Baseline PR-AUC | 0.701 |
| Baseline recall at 0.5% false positives | 74.6% |
| Challenger PR-AUC | 0.767 |
| Challenger recall at 0.5% false positives | 80.9% |

## 5. An edge case from the blueprint

**Legitimate family sharing address and phone.** cluster looks like a ring. Planned response: Household detection and relationship-type edge weights. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 180140 |
| `positive_rate` | 0.0049351 |
| `test_rows` | 60614 |
| `test_positive_rate` | 0.0057742 |
| `baseline_lr.pr_auc` | 0.70108 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.74571 |
| `baseline_lr.brier` | 0.0029098 |
| `challenger_hgb.pr_auc` | 0.7666 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.80857 |
| `challenger_hgb.brier` | 0.0024331 |

</details>
