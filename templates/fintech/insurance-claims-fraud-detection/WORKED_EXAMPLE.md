# Insurance Claims Fraud Detection: worked example

> Run on synthetic data with `tabular` engine, seed 87481, knobs {"n_entities": 2240, "positive_entity_rate": 0.034, "n_flash_sales": 5}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Triage incoming claims by fraud likelihood to route investigators to the highest recovery opportunities while paying genuine claims fast.

**Constraints that shape the design.** Straight-through payment for low-risk claims; Evidence preserved for litigation; Fair claims handling regulations

**Label in this use case.** For "Insurance Claims Fraud Detection": Triage incoming claims by fraud likelihood to route investigators to the highest recovery opportunities while paying genuine claims fast. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from investigated claims.

## 2. Choose the signals

Your strongest signal is **Provider-claimant co-occurrence** (count of past claims where the pair appears together). Its rule: Use claims before the current one. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.64% of the test period) and labels arrive weeks late. A model that always answers no would be 99.36% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.665 and finds 81.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.827 and 84.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.64% |
| Baseline PR-AUC | 0.665 |
| Baseline recall at 0.5% false positives | 81.6% |
| Challenger PR-AUC | 0.827 |
| Challenger recall at 0.5% false positives | 84.8% |

## 5. An edge case from the blueprint

**Catastrophe event (hurricane) floods genuine claims.** volume spike triggers false flags. Planned response: Event-aware baselines and CAT-mode thresholds. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 172999 |
| `positive_rate` | 0.0048786 |
| `test_rows` | 58269 |
| `test_positive_rate` | 0.0064185 |
| `baseline_lr.pr_auc` | 0.66517 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.81551 |
| `baseline_lr.brier` | 0.0052133 |
| `challenger_hgb.pr_auc` | 0.82736 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84759 |
| `challenger_hgb.brier` | 0.0019697 |

</details>
