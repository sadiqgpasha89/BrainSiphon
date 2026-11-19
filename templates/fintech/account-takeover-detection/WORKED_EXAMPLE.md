# Account Takeover Detection: worked example

> Run on synthetic data with `tabular` engine, seed 86500, knobs {"n_entities": 2160, "positive_entity_rate": 0.025, "n_flash_sales": 4}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect credential-stuffing and session-hijack logins in real time and step up authentication without adding friction for real users.

**Constraints that shape the design.** Added login latency under 60 ms; Step-up rate under 2% of sessions; GDPR-compliant device signals

**Label in this use case.** For "Account Takeover Detection": Detect credential-stuffing and session-hijack logins in real time and step up authentication without adding friction for real users. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels come only from users who reported fraud.

## 2. Choose the signals

Your strongest signal is **Device novelty vs history** (hamming distance of device fingerprint to the account's top-3 devices). Its rule: Fingerprint salt rotation must not create fake novelty. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.40% of the test period) and labels arrive weeks late. A model that always answers no would be 99.60% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.408 and finds 68.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.769 and 81.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.40% |
| Baseline PR-AUC | 0.408 |
| Baseline recall at 0.5% false positives | 68.1% |
| Challenger PR-AUC | 0.769 |
| Challenger recall at 0.5% false positives | 81.1% |

## 5. An edge case from the blueprint

**Corporate VPN rollout.** thousands of users appear to travel together. Planned response: Cohort-level baseline shift detector with automatic dampening. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 166244 |
| `positive_rate` | 0.0034287 |
| `test_rows` | 56294 |
| `test_positive_rate` | 0.0040324 |
| `baseline_lr.pr_auc` | 0.40761 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.68137 |
| `baseline_lr.brier` | 0.0077501 |
| `challenger_hgb.pr_auc` | 0.76941 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.81057 |
| `challenger_hgb.brier` | 0.001567 |

</details>
