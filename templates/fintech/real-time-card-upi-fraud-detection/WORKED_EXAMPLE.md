# Real-Time Card & UPI Fraud Detection: worked example

> Run on synthetic data with Hand-written starter, in 1.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Block fraudulent authorisations inside the payment auth path while keeping false declines under 0.3% of genuine volume.

**Constraints that shape the design.** p99 under 8 ms inside the auth path; PCI-DSS scope minimisation; every decline needs a reason code

**Label in this use case.** For "Real-Time Card & UPI Fraud Detection": Block fraudulent authorisations inside the payment auth path while keeping false declines under 0.3% of genuine volume. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on confirmed fraud only hides review-queue selection bias.

## 2. Choose the signals

Your strongest signal is **Card velocity 1m/1h/24h** (count and sum of authorisations in sliding windows keyed by card token). Its rule: Windows must close strictly before decision time. In the starter, the closest executable idea is ****: . Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

This pack ships a hand-written starter with its own data generator, written to plant the traps named in the blueprint. Its README lists them one by one, and its tests make each one executable.

## 4. Baseline against the stronger design

The starter runs a baseline and a stronger design under the evaluation discipline the blueprint prescribes. The table at the end of this page lists every number from this run.

| Result | Value |
|---|---|
| seed | 7 |
| rows | 188594 |
| fraud_rate | 0.003569 |
| test_rows | 63281 |
| test_fraud_rate | 0.004646 |
| policy_assumptions.max_false_decline | 0.003 |

## 5. An edge case from the blueprint

**Flash-sale traffic spike.** velocity features flag genuine buyers en masse. Planned response: Per-merchant adaptive baselines plus an event-calendar feature. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Read starter/README.md for the milestone-by-milestone expectations; then replace the synthetic generator with your data and keep the tests.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `seed` | 7 |
| `rows` | 188594 |
| `fraud_rate` | 0.0035685 |
| `test_rows` | 63281 |
| `test_fraud_rate` | 0.0046459 |
| `policy_assumptions.max_false_decline` | 0.003 |
| `policy_assumptions.valid_headroom` | 0.5 |
| `policy_assumptions.step_up_budget` | 0.02 |
| `policy_assumptions.step_up_failure_rate` | 0.05 |
| `baseline_lr.pr_auc` | 0.68869 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.7381 |
| `baseline_lr.brier` | 0.0022374 |
| `baseline_lr.thresholds.step_up` | 0.010487 |
| `baseline_lr.thresholds.block` | 0.2863 |
| `baseline_lr.policy.genuine_rows` | 62987 |
| `baseline_lr.policy.fraud_rows` | 294 |
| `baseline_lr.policy.genuine.allow` | 61561 |
| `baseline_lr.policy.genuine.step_up` | 1311 |
| `baseline_lr.policy.genuine.block` | 115 |
| `baseline_lr.policy.fraud.allow` | 41 |
| `baseline_lr.policy.fraud.step_up` | 53 |
| `baseline_lr.policy.fraud.block` | 200 |
| `baseline_lr.policy.false_decline_rate` | 0.0028665 |
| `baseline_lr.policy.block_rate_on_genuine` | 0.0018258 |
| `baseline_lr.policy.step_up_rate_on_genuine` | 0.020814 |
| `baseline_lr.policy.fraud_blocked` | 0.68027 |
| `baseline_lr.policy.fraud_stepped_up` | 0.18027 |
| `baseline_lr.policy.fraud_allowed` | 0.13946 |
| `challenger_hgb.pr_auc` | 0.74628 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.7585 |
| `challenger_hgb.brier` | 0.0019743 |
| `challenger_hgb.thresholds.step_up` | 0.0073653 |
| `challenger_hgb.thresholds.block` | 0.19553 |
| `challenger_hgb.policy.genuine_rows` | 62987 |
| `challenger_hgb.policy.fraud_rows` | 294 |
| `challenger_hgb.policy.genuine.allow` | 61803 |
| `challenger_hgb.policy.genuine.step_up` | 1146 |
| `challenger_hgb.policy.genuine.block` | 38 |
| `challenger_hgb.policy.fraud.allow` | 32 |
| `challenger_hgb.policy.fraud.step_up` | 80 |
| `challenger_hgb.policy.fraud.block` | 182 |
| `challenger_hgb.policy.false_decline_rate` | 0.001513 |
| `challenger_hgb.policy.block_rate_on_genuine` | 0.0006033 |
| `challenger_hgb.policy.step_up_rate_on_genuine` | 0.018194 |
| `challenger_hgb.policy.fraud_blocked` | 0.61905 |
| `challenger_hgb.policy.fraud_stepped_up` | 0.27211 |
| `challenger_hgb.policy.fraud_allowed` | 0.10884 |

</details>
