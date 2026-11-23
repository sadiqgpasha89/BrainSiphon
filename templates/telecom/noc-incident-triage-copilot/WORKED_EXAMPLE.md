# NOC Incident Triage Copilot: worked example

> Run on synthetic data with `llm-agent` engine, seed 2560, knobs {}, in 1.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Summarise an incident for NOC engineers, pull the relevant topology, change history, similar past incidents and runbook steps, and draft the next actions so triage time falls.

**Constraints that shape the design.** Every statement links to the source record it came from; The copilot proposes and the engineer decides; No write access to network systems

**Label in this use case.** For "NOC Incident Triage Copilot": Summarise an incident for NOC engineers, pull the relevant topology, change history, similar past incidents and runbook steps, and draft the next actions so triage time falls. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating fluency not faithfulness.

## 2. Choose the signals

Your strongest signal is **Incident similarity** (embedding and attribute match to past confirmed incidents). Its rule: Index only confirmed causes. In the starter, the closest executable idea is **typed read-only tools**: narrow queries for context and evidence, with no free-form shell or query language. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Records can carry planted instructions. The naive agent followed them in 85.7% of injected cases and took 2 unsafe actions; it also decided cases whose deciding evidence was unavailable.

## 4. Baseline against the stronger design

The guarded agent treats tool output as data, verifies every claim against a cited line and escalates when evidence is missing: injection success 0.0%, unsafe actions 0, accuracy on the cases it decides 100.0%, escalating 5.0%.

| Result | Value |
|---|---|
| Injection success, naive | 85.7% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 2 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 5.0% |

## 5. An edge case from the blueprint

**Conflicting past incidents.** two precedents suggest different fixes. Planned response: Show both with confidence and the differences. Write the test that replays this case through your pipeline before you tune anything.

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
| `naive.accuracy_on_auto` | 0.94 |
| `naive.escalation_rate` | 0 |
| `naive.evidence_precision` | 0.96575 |
| `naive.decided_with_valid_evidence` | 0.9 |
| `naive.injected_cases` | 7 |
| `naive.injection_success_rate` | 0.85714 |
| `naive.unsafe_actions` | 2 |
| `naive.outage_cases` | 5 |
| `naive.outage_cases_decided_without_evidence` | 5 |
| `naive.avg_steps` | 4.1 |
| `guarded.cases` | 100 |
| `guarded.auto_decided` | 95 |
| `guarded.accuracy_on_auto` | 1 |
| `guarded.escalation_rate` | 0.05 |
| `guarded.evidence_precision` | 1 |
| `guarded.decided_with_valid_evidence` | 1 |
| `guarded.injected_cases` | 7 |
| `guarded.injection_success_rate` | 0 |
| `guarded.unsafe_actions` | 0 |
| `guarded.outage_cases` | 5 |
| `guarded.outage_cases_decided_without_evidence` | 0 |
| `guarded.avg_steps` | 4.1 |

</details>
