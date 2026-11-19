# Buyer Lead Scoring & Routing: worked example

> Run on synthetic data with `tabular` engine, seed 13312, knobs {"n_entities": 2540, "positive_entity_rate": 0.037, "n_flash_sales": 3}, in 3.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly.

**Constraints that shape the design.** Scoring and routing finish within 80 ms of the enquiry; Leads are distributed fairly among agents and teams within stated rules; No protected attributes or proxies in scoring or routing

**Label in this use case.** For "Buyer Lead Scoring & Routing": Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes are observed only for leads that were contacted, so the model cannot learn from the rest.

## 2. Choose the signals

Your strongest signal is **Viewing depth** (number of distinct listings viewed and the share viewed more than once in 7 days). Its rule: Bots inflate views, so filter them before computing. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.53% of the test period) and labels arrive weeks late. A model that always answers no would be 99.47% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.686 and finds 67.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.797 and 80.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.53% |
| Baseline PR-AUC | 0.686 |
| Baseline recall at 0.5% false positives | 67.0% |
| Challenger PR-AUC | 0.797 |
| Challenger recall at 0.5% false positives | 80.0% |

## 5. An edge case from the blueprint

**Bot enquiries.** Bots send fake enquiries that waste agent time and distort the model. Planned response: Filter by bot signals and exclude them from training labels. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 195457 |
| `positive_rate` | 0.0048502 |
| `test_rows` | 64501 |
| `test_positive_rate` | 0.0053488 |
| `baseline_lr.pr_auc` | 0.68635 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.66957 |
| `baseline_lr.brier` | 0.0029783 |
| `challenger_hgb.pr_auc` | 0.79675 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8 |
| `challenger_hgb.brier` | 0.0020488 |

</details>
