# Credential Stuffing Detection: worked example

> Run on synthetic data with `tabular` engine, seed 17934, knobs {"n_entities": 1870, "positive_entity_rate": 0.02, "n_flash_sales": 8}, in 1.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect automated credential-stuffing attempts on login endpoints and block them while sparing real users who forget passwords.

**Constraints that shape the design.** Login decision within 30 ms; Low friction for real users; Distributed low-and-slow attacks

**Label in this use case.** For "Credential Stuffing Detection": Detect automated credential-stuffing attempts on login endpoints and block them while sparing real users who forget passwords. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from detected campaigns.

## 2. Choose the signals

Your strongest signal is **Global failure-rate spike** (failed logins per minute vs baseline). Its rule: Baseline. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.26% of the test period) and labels arrive weeks late. A model that always answers no would be 99.74% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.838 and finds 87.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.849 and 87.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.26% |
| Baseline PR-AUC | 0.838 |
| Baseline recall at 0.5% false positives | 87.1% |
| Challenger PR-AUC | 0.849 |
| Challenger recall at 0.5% false positives | 87.9% |

## 5. An edge case from the blueprint

**Password manager mass logins after outage.** spikes look like attack. Planned response: Cohort baselines and incident feeds. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 142665 |
| `positive_rate` | 0.002979 |
| `test_rows` | 48060 |
| `test_positive_rate` | 0.0025801 |
| `baseline_lr.pr_auc` | 0.83848 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.87097 |
| `baseline_lr.brier` | 0.00079153 |
| `challenger_hgb.pr_auc` | 0.84908 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.87903 |
| `challenger_hgb.brier` | 0.00071746 |

</details>
