# Provider Privilege & Scope-of-Practice Validation: worked example

> Run on synthetic data with `tabular` engine, seed 63421, knobs {"n_entities": 2000, "positive_entity_rate": 0.038, "n_flash_sales": 4}, in 9.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception.

**Constraints that shape the design.** A rules engine decides eligibility and the model may only prioritise exceptions and never invents clinical authorisation; The medical staff office or authorised committee makes every privilege decision; All rules are versioned with effective dates and cite their bylaw source

**Label in this use case.** For "Provider Privilege & Scope-of-Practice Validation": Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the ranker decide eligibility.

## 2. Choose the signals

Your strongest signal is **Privilege coverage** (procedure code mapped to required privilege vs granted privilege). Its rule: Catalogue version at the assignment date. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.55% of the test period) and labels arrive weeks late. A model that always answers no would be 99.45% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.758 and finds 78.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.815 and 80.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.55% |
| Baseline PR-AUC | 0.758 |
| Baseline recall at 0.5% false positives | 78.7% |
| Challenger PR-AUC | 0.815 |
| Challenger recall at 0.5% false positives | 80.9% |

## 5. An edge case from the blueprint

**Bylaws amended mid-year.** the old rule is applied. Planned response: Versioned rules with effective dates and a rule-change replay. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 152600 |
| `positive_rate` | 0.0054718 |
| `test_rows` | 51358 |
| `test_positive_rate` | 0.0054909 |
| `baseline_lr.pr_auc` | 0.75806 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78723 |
| `baseline_lr.brier` | 0.002715 |
| `challenger_hgb.pr_auc` | 0.81532 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.80851 |
| `challenger_hgb.brier` | 0.0016995 |

</details>
