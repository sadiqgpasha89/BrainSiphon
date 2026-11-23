# Phishing Site Takedown Prioritisation: worked example

> Run on synthetic data with `tabular` engine, seed 57540, knobs {"n_entities": 2640, "positive_entity_rate": 0.044, "n_flash_sales": 8}, in 4.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank reported phishing sites and scam domains for takedown by victim reach and brand or government impersonation so scarce takedown effort lands where harm is highest.

**Constraints that shape the design.** Takedown requests reviewed by an analyst; Evidence pack for each request; Legitimate sites protected by checks

**Label in this use case.** For "Phishing Site Takedown Prioritisation": Rank reported phishing sites and scam domains for takedown by victim reach and brand or government impersonation so scarce takedown effort lands where harm is highest. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Blind blocking.

## 2. Choose the signals

Your strongest signal is **Page similarity to known brands** (visual and text similarity). Its rule: From the vision model. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.67% of the test period) and labels arrive weeks late. A model that always answers no would be 99.33% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.718 and finds 85.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.897 and 89.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.67% |
| Baseline PR-AUC | 0.718 |
| Baseline recall at 0.5% false positives | 85.0% |
| Challenger PR-AUC | 0.897 |
| Challenger recall at 0.5% false positives | 89.6% |

## 5. An edge case from the blueprint

**Compromised legitimate site.** a real business is hacked. Planned response: Owner notification instead of takedown. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 203902 |
| `positive_rate` | 0.0060863 |
| `test_rows` | 68470 |
| `test_positive_rate` | 0.0067329 |
| `baseline_lr.pr_auc` | 0.7175 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.85033 |
| `baseline_lr.brier` | 0.0067928 |
| `challenger_hgb.pr_auc` | 0.89664 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.89588 |
| `challenger_hgb.brier` | 0.0014482 |

</details>
