# Vendor Credential Compliance Risk Scoring: worked example

> Run on synthetic data with `tabular` engine, seed 69790, knobs {"n_entities": 2280, "positive_entity_rate": 0.026, "n_flash_sales": 5}, in 9.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation.

**Constraints that shape the design.** Rules-first validation decides compliance and the model only prioritises risk; Access remains governed by facility policy and authorised staff; Missing evidence is shown as missing and not as ineligible

**Label in this use case.** For "Vendor Credential Compliance Risk Scoring": Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring on records already remediated.

## 2. Choose the signals

Your strongest signal is **Days to nearest expiry** (minimum days to expiry across required items). Its rule: Use document dates. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.30% of the test period) and labels arrive weeks late. A model that always answers no would be 99.70% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.642 and finds 73.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.683 and 71.3%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.30% |
| Baseline PR-AUC | 0.642 |
| Baseline recall at 0.5% false positives | 73.6% |
| Challenger PR-AUC | 0.683 |
| Challenger recall at 0.5% false positives | 71.3% |

## 5. An edge case from the blueprint

**Vendor submits late.** an eligible person is blocked. Planned response: Provisional status rules defined in policy. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 173172 |
| `positive_rate` | 0.0032511 |
| `test_rows` | 57430 |
| `test_positive_rate` | 0.0030298 |
| `baseline_lr.pr_auc` | 0.64189 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.73563 |
| `baseline_lr.brier` | 0.0016177 |
| `challenger_hgb.pr_auc` | 0.68321 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.71264 |
| `challenger_hgb.brier` | 0.0014586 |

</details>
