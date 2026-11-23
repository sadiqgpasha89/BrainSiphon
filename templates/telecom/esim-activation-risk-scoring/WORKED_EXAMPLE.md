# eSIM Activation Risk Scoring: worked example

> Run on synthetic data with `tabular` engine, seed 49237, knobs {"n_entities": 1880, "positive_entity_rate": 0.045, "n_flash_sales": 8}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score eSIM and SIM-swap activation requests for takeover risk in real time so genuine customers are served quickly and risky activations get step-up verification.

**Constraints that shape the design.** Decision within 60 ms of the request; False step-up rate under 2% of genuine requests; Step-up methods accessible to all customers

**Label in this use case.** For "eSIM Activation Risk Scoring": Score eSIM and SIM-swap activation requests for takeover risk in real time so genuine customers are served quickly and risky activations get step-up verification. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting verification failures as fraud.

## 2. Choose the signals

Your strongest signal is **Recent credential or contact changes** (password, email or phone changes in the last 7 days). Its rule: From identity events. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.59% of the test period) and labels arrive weeks late. A model that always answers no would be 99.41% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.578 and finds 64.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.696 and 71.2%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.59% |
| Baseline PR-AUC | 0.578 |
| Baseline recall at 0.5% false positives | 64.6% |
| Challenger PR-AUC | 0.696 |
| Challenger recall at 0.5% false positives | 71.2% |

## 5. An edge case from the blueprint

**Genuine device upgrade.** many new device signals. Planned response: Use the customer's own device history and a smooth step-up. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 145461 |
| `positive_rate` | 0.0054379 |
| `test_rows` | 48490 |
| `test_positive_rate` | 0.0058775 |
| `baseline_lr.pr_auc` | 0.57772 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.64561 |
| `baseline_lr.brier` | 0.0065284 |
| `challenger_hgb.pr_auc` | 0.69625 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.71228 |
| `challenger_hgb.brier` | 0.0026783 |

</details>
