# Fake & Bulk Account Creation Detection: worked example

> Run on synthetic data with `tabular` engine, seed 68096, knobs {"n_entities": 2940, "positive_entity_rate": 0.034, "n_flash_sales": 5}, in 3.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Stop automated and farmed account registrations at signup, protecting downstream trust, promos and abuse systems.

**Constraints that shape the design.** Signup decision within 50 ms; Low friction for genuine users; Disposable-email and SMS farms

**Label in this use case.** For "Fake & Bulk Account Creation Detection": Stop automated and farmed account registrations at signup, protecting downstream trust, promos and abuse systems. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from accounts later banned (late and biased).

## 2. Choose the signals

Your strongest signal is **Email pattern similarity in window** (edit-distance clusters of emails in 1 hour). Its rule: Window before signup. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.42% of the test period) and labels arrive weeks late. A model that always answers no would be 99.58% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.773 and finds 82.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.819 and 84.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.42% |
| Baseline PR-AUC | 0.773 |
| Baseline recall at 0.5% false positives | 82.6% |
| Challenger PR-AUC | 0.819 |
| Challenger recall at 0.5% false positives | 84.9% |

## 5. An edge case from the blueprint

**Marketing campaign causes real signup spikes.** cohort features flag genuine users. Planned response: Campaign calendar integration and acquisition-source baselines. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 225222 |
| `positive_rate` | 0.0045644 |
| `test_rows` | 74823 |
| `test_positive_rate` | 0.0041698 |
| `baseline_lr.pr_auc` | 0.77339 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.826 |
| `baseline_lr.brier` | 0.0018024 |
| `challenger_hgb.pr_auc` | 0.81857 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84936 |
| `challenger_hgb.brier` | 0.001367 |

</details>
