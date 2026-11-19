# Development Site Feasibility Scoring: worked example

> Run on synthetic data with `tabular` engine, seed 84623, knobs {"n_entities": 3000, "positive_entity_rate": 0.028, "n_flash_sales": 7}, in 2.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Screen land parcels for development potential by combining zoning, constraints, comparable projects and market demand.

**Constraints that shape the design.** Zoning data cited; Screening, not a legal opinion; Analyst reviews top sites

**Label in this use case.** For "Development Site Feasibility Scoring": Screen land parcels for development potential by combining zoning, constraints, comparable projects and market demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Only past proceeding sites labelled.

## 2. Choose the signals

Your strongest signal is **Allowable floor area** (zoning-derived buildable area). Its rule: Rule parsing. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.51% of the test period) and labels arrive weeks late. A model that always answers no would be 99.49% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.787 and finds 78.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.841 and 84.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.51% |
| Baseline PR-AUC | 0.787 |
| Baseline recall at 0.5% false positives | 78.2% |
| Challenger PR-AUC | 0.841 |
| Challenger recall at 0.5% false positives | 84.7% |

## 5. An edge case from the blueprint

**Zoning change pending.** A zoning change is pending and the rules used for scoring may soon be out of date. Planned response: Flag sites with a pending change and score under both the current and proposed rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 232298 |
| `positive_rate` | 0.0039174 |
| `test_rows` | 76937 |
| `test_positive_rate` | 0.0051081 |
| `baseline_lr.pr_auc` | 0.78663 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78163 |
| `baseline_lr.brier` | 0.0018968 |
| `challenger_hgb.pr_auc` | 0.84122 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84733 |
| `challenger_hgb.brier` | 0.0015945 |

</details>
