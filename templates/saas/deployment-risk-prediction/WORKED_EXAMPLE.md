# Deployment Risk Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 61758, knobs {"n_entities": 2060, "positive_entity_rate": 0.034, "n_flash_sales": 5}, in 1.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict the risk that a deployment causes an incident and apply stricter rollout policies (canary size, bake time) accordingly.

**Constraints that shape the design.** Decision at merge or deploy time; Explainable factors; Low friction

**Label in this use case.** For "Deployment Risk Prediction": Predict the risk that a deployment causes an incident and apply stricter rollout policies (canary size, bake time) accordingly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled incidents.

## 2. Choose the signals

Your strongest signal is **Change size and files touched** (diff statistics). Its rule: Metadata. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.47% of the test period) and labels arrive weeks late. A model that always answers no would be 99.53% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.836 and finds 85.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.864 and 89.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.47% |
| Baseline PR-AUC | 0.836 |
| Baseline recall at 0.5% false positives | 85.9% |
| Challenger PR-AUC | 0.864 |
| Challenger recall at 0.5% false positives | 89.1% |

## 5. An edge case from the blueprint

**Incident attribution wrong.** model learns the wrong risk drivers. Planned response: Causal attribution via bisect and postmortem linkage. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 158200 |
| `positive_rate` | 0.0052528 |
| `test_rows` | 52221 |
| `test_positive_rate` | 0.004749 |
| `baseline_lr.pr_auc` | 0.83557 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.85887 |
| `baseline_lr.brier` | 0.0018362 |
| `challenger_hgb.pr_auc` | 0.86425 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.89113 |
| `challenger_hgb.brier` | 0.0012942 |

</details>
