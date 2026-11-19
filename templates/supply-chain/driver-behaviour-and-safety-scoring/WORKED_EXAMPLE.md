# Driver Behaviour & Safety Scoring: worked example

> Run on synthetic data with `tabular` engine, seed 51817, knobs {"n_entities": 2010, "positive_entity_rate": 0.023, "n_flash_sales": 4}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score driver safety from telematics and video events to target coaching and reduce accidents without unfair penalties.

**Constraints that shape the design.** Driver privacy; Fair normalisation by route and vehicle; Coaching programme integration

**Label in this use case.** For "Driver Behaviour & Safety Scoring": Score driver safety from telematics and video events to target coaching and reduce accidents without unfair penalties. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Incident labels sparse.

## 2. Choose the signals

Your strongest signal is **Harsh events by context** (brake and cornering events normalised). Its rule: Road type. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.25% of the test period) and labels arrive weeks late. A model that always answers no would be 99.75% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.580 and finds 68.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.644 and 70.3%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.25% |
| Baseline PR-AUC | 0.580 |
| Baseline recall at 0.5% false positives | 68.0% |
| Challenger PR-AUC | 0.644 |
| Challenger recall at 0.5% false positives | 70.3% |

## 5. An edge case from the blueprint

**Camera blocked or disabled.** a covered or unplugged camera produces no events, so risky drivers look perfectly safe. Planned response: Coverage monitoring and data-quality flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 152661 |
| `positive_rate` | 0.0029346 |
| `test_rows` | 50744 |
| `test_positive_rate` | 0.0025225 |
| `baseline_lr.pr_auc` | 0.57991 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.67969 |
| `baseline_lr.brier` | 0.0014949 |
| `challenger_hgb.pr_auc` | 0.64376 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.70312 |
| `challenger_hgb.brier` | 0.0013259 |

</details>
