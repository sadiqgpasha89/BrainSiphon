# Recipe Change Impact Assessment: worked example

> Run on synthetic data with `tabular` engine, seed 12119, knobs {"n_entities": 2720, "positive_entity_rate": 0.034, "n_flash_sales": 6}, in 4.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate the effect of a proposed recipe or parameter change on yield, quality and energy from past changes and process models, so engineers prioritise and de-risk trials.

**Constraints that shape the design.** Estimates with uncertainty and the evidence base; Change control approval remains mandatory; Model results never replace validation trials

**Label in this use case.** For "Recipe Change Impact Assessment": Estimate the effect of a proposed recipe or parameter change on yield, quality and energy from past changes and process models, so engineers prioritise and de-risk trials. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Before-and-after comparisons.

## 2. Choose the signals

Your strongest signal is **Similar past changes** (changes of the same type on similar products). Its rule: By parameter and product family. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.45% of the test period) and labels arrive weeks late. A model that always answers no would be 99.55% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.566 and finds 68.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.774 and 80.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.45% |
| Baseline PR-AUC | 0.566 |
| Baseline recall at 0.5% false positives | 68.4% |
| Challenger PR-AUC | 0.774 |
| Challenger recall at 0.5% false positives | 80.1% |

## 5. An edge case from the blueprint

**No precedent.** the change type is novel. Planned response: Wide intervals and a pilot-first rule. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 206681 |
| `positive_rate` | 0.0046352 |
| `test_rows` | 68330 |
| `test_positive_rate` | 0.0044929 |
| `baseline_lr.pr_auc` | 0.56616 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.68404 |
| `baseline_lr.brier` | 0.010023 |
| `challenger_hgb.pr_auc` | 0.77368 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8013 |
| `challenger_hgb.brier` | 0.0017331 |

</details>
