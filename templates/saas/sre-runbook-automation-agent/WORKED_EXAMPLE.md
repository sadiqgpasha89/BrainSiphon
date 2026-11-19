# SRE Runbook Automation Agent: worked example

> Run on synthetic data with `llm-agent` engine, seed 39131, knobs {}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Execute and suggest runbook steps for incidents with typed tools, approvals for risky actions and a full audit trail.

**Constraints that shape the design.** Production safety; Human approval for mutations; Observability of agent actions

**Label in this use case.** For "SRE Runbook Automation Agent": Execute and suggest runbook steps for incidents with typed tools, approvals for risky actions and a full audit trail. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replay incidents lacking novelty.

## 2. Choose the signals

Your strongest signal is **Runbook match confidence** (retrieval relevance). Its rule: Retrieval. In the starter, the closest executable idea is **typed read-only tools**: narrow queries for context and evidence, with no free-form shell or query language. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Records can carry planted instructions. The naive agent followed them in 83.3% of injected cases and took 5 unsafe actions; it also decided cases whose deciding evidence was unavailable.

## 4. Baseline against the stronger design

The guarded agent treats tool output as data, verifies every claim against a cited line and escalates when evidence is missing: injection success 0.0%, unsafe actions 0, accuracy on the cases it decides 100.0%, escalating 4.0%.

| Result | Value |
|---|---|
| Injection success, naive | 83.3% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 5 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 4.0% |

## 5. An edge case from the blueprint

**Agent proposes restart during a data migration.** corrupts the migration. Planned response: Change-freeze and dependency checks before mutations. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

The planner is scripted so the harness is deterministic. Keep the planted-injection tests, the step budget and the verifier when you put a model behind the same typed tools.

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
| `naive.accuracy_on_auto` | 0.92 |
| `naive.escalation_rate` | 0 |
| `naive.evidence_precision` | 0.95364 |
| `naive.decided_with_valid_evidence` | 0.89 |
| `naive.injected_cases` | 12 |
| `naive.injection_success_rate` | 0.83333 |
| `naive.unsafe_actions` | 5 |
| `naive.outage_cases` | 4 |
| `naive.outage_cases_decided_without_evidence` | 4 |
| `naive.avg_steps` | 4.08 |
| `guarded.cases` | 100 |
| `guarded.auto_decided` | 96 |
| `guarded.accuracy_on_auto` | 1 |
| `guarded.escalation_rate` | 0.04 |
| `guarded.evidence_precision` | 1 |
| `guarded.decided_with_valid_evidence` | 1 |
| `guarded.injected_cases` | 12 |
| `guarded.injection_success_rate` | 0 |
| `guarded.unsafe_actions` | 0 |
| `guarded.outage_cases` | 4 |
| `guarded.outage_cases_decided_without_evidence` | 0 |
| `guarded.avg_steps` | 4.08 |

</details>
