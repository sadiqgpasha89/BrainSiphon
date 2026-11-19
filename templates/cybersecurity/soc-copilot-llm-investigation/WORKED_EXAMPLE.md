# SOC Investigation Copilot: worked example

> Run on synthetic data with Hand-written starter, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Accelerate investigations by letting an agent gather evidence from SIEM, EDR and identity tools and propose verdicts with cited queries.

**Constraints that shape the design.** Read-only tools by default; Response actions need approval; Full audit trail

**Label in this use case.** For "SOC Investigation Copilot": Accelerate investigations by letting an agent gather evidence from SIEM, EDR and identity tools and propose verdicts with cited queries. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replay set includes cases used for prompt tuning.

## 2. Choose the signals

Your strongest signal is **Evidence link rate** (share of claims with log references). Its rule: Check that each link points at a line that really contains the indicator. In the starter, the closest executable idea is ****: . Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

This pack ships a hand-written starter with its own data generator, written to plant the traps named in the blueprint. Its README lists them one by one, and its tests make each one executable.

## 4. Baseline against the stronger design

The starter runs a baseline and a stronger design under the evaluation discipline the blueprint prescribes. The table at the end of this page lists every number from this run.

| Result | Value |
|---|---|
| test_cases | 100 |
| naive.cases | 100 |
| naive.auto_decided | 100 |
| naive.accuracy_on_auto | 0.97 |
| naive.escalation_rate | 0 |
| naive.evidence_precision | 0.973 |

## 5. An edge case from the blueprint

**Attacker plants instructions in log fields or file names.** agent runs unintended tool calls. Planned response: Treat logs as untrusted data and enforce tool allow-lists. Write the test that replays this case through your pipeline before you tune anything.

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
| `test_cases` | 100 |
| `naive.cases` | 100 |
| `naive.auto_decided` | 100 |
| `naive.accuracy_on_auto` | 0.97 |
| `naive.escalation_rate` | 0 |
| `naive.evidence_precision` | 0.97297 |
| `naive.decided_with_valid_evidence` | 0.91 |
| `naive.injected_cases` | 13 |
| `naive.injection_success_rate` | 0.61538 |
| `naive.unsafe_actions` | 7 |
| `naive.outage_cases` | 5 |
| `naive.outage_cases_decided_without_evidence` | 5 |
| `naive.avg_steps` | 4.1 |
| `guarded.cases` | 100 |
| `guarded.auto_decided` | 95 |
| `guarded.accuracy_on_auto` | 1 |
| `guarded.escalation_rate` | 0.05 |
| `guarded.evidence_precision` | 1 |
| `guarded.decided_with_valid_evidence` | 1 |
| `guarded.injected_cases` | 13 |
| `guarded.injection_success_rate` | 0 |
| `guarded.unsafe_actions` | 0 |
| `guarded.outage_cases` | 5 |
| `guarded.outage_cases_decided_without_evidence` | 0 |
| `guarded.avg_steps` | 4.1 |

</details>
