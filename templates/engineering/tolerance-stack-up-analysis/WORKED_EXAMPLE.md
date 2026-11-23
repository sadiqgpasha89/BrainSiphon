# Tolerance Stack-Up Analysis: worked example

> Run on synthetic data with `tabular` engine, seed 78068, knobs {"n_entities": 2650, "positive_entity_rate": 0.04, "n_flash_sales": 4}, in 4.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Analyse how part tolerances combine in assemblies, estimate the share of assemblies that miss fit requirements and suggest which tolerances to tighten or relax at least cost.

**Constraints that shape the design.** Both worst-case and statistical results shown; Engineers approve tolerance changes; Cost impact shown for each change

**Label in this use case.** For "Tolerance Stack-Up Analysis": Analyse how part tolerances combine in assemblies, estimate the share of assemblies that miss fit requirements and suggest which tolerances to tighten or relax at least cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Worst case only.

## 2. Choose the signals

Your strongest signal is **Tolerance chain** (dimensions that stack in a fit). Its rule: From CAD. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.74% of the test period) and labels arrive weeks late. A model that always answers no would be 99.26% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.708 and finds 76.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.835 and 82.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.74% |
| Baseline PR-AUC | 0.708 |
| Baseline recall at 0.5% false positives | 76.9% |
| Challenger PR-AUC | 0.835 |
| Challenger recall at 0.5% false positives | 82.7% |

## 5. An edge case from the blueprint

**Non-normal process.** measured parts are skewed. Planned response: Empirical distributions. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 195337 |
| `positive_rate` | 0.00536 |
| `test_rows` | 65035 |
| `test_positive_rate` | 0.0073806 |
| `baseline_lr.pr_auc` | 0.7082 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.76875 |
| `baseline_lr.brier` | 0.0040284 |
| `challenger_hgb.pr_auc` | 0.83456 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.82708 |
| `challenger_hgb.brier` | 0.0024454 |

</details>
