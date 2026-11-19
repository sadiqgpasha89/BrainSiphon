# Acquisition Deal Sourcing: worked example

> Run on synthetic data with `tabular` engine, seed 24970, knobs {"n_entities": 2610, "positive_entity_rate": 0.023, "n_flash_sales": 4}, in 1.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals.

**Constraints that shape the design.** Data licences for ownership, debt and mobility sources are respected; Owner contact follows fair and lawful practice; Analysts review every list before outreach

**Label in this use case.** For "Acquisition Deal Sourcing": Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observed sales are biased towards properties that were listed, so off-market sales are missed.

## 2. Choose the signals

Your strongest signal is **Debt maturity** (months until the main loan matures). Its rule: Debt data are incomplete for private loans. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.35% of the test period) and labels arrive weeks late. A model that always answers no would be 99.65% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.715 and finds 80.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.752 and 80.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.35% |
| Baseline PR-AUC | 0.715 |
| Baseline recall at 0.5% false positives | 80.5% |
| Challenger PR-AUC | 0.752 |
| Challenger recall at 0.5% false positives | 80.1% |

## 5. An edge case from the blueprint

**Shell ownership.** Ownership is hidden behind shell companies. Planned response: Resolve entities across registries and build the ownership graph. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 194964 |
| `positive_rate` | 0.0028877 |
| `test_rows` | 63821 |
| `test_positive_rate` | 0.0034628 |
| `baseline_lr.pr_auc` | 0.71512 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.80543 |
| `baseline_lr.brier` | 0.0015748 |
| `challenger_hgb.pr_auc` | 0.75232 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8009 |
| `challenger_hgb.brier` | 0.0015918 |

</details>
