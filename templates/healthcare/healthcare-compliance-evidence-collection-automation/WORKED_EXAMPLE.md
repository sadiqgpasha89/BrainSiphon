# Healthcare Compliance Evidence Collection Automation: worked example

> Run on synthetic data with `llm-agent` engine, seed 32966, knobs {}, in 3.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand.

**Constraints that shape the design.** Control owners attest evidence and the agent never fabricates, edits or backfills missing proof; Each item keeps an immutable reference, retrieval time and source system; Freshness is checked against the audit period

**Label in this use case.** For "Healthcare Compliance Evidence Collection Automation": Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the agent fill missing evidence.

## 2. Choose the signals

Your strongest signal is **Requirement match score** (match between an artifact and the evidence requirement). Its rule: Reviewed mappings. In the starter, the closest executable idea is **typed read-only tools**: narrow queries for context and evidence, with no free-form shell or query language. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Records can carry planted instructions. The naive agent followed them in 71.4% of injected cases and took 8 unsafe actions; it also decided cases whose deciding evidence was unavailable.

## 4. Baseline against the stronger design

The guarded agent treats tool output as data, verifies every claim against a cited line and escalates when evidence is missing: injection success 0.0%, unsafe actions 0, accuracy on the cases it decides 100.0%, escalating 8.0%.

| Result | Value |
|---|---|
| Injection success, naive | 71.4% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 8 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 8.0% |

## 5. An edge case from the blueprint

**Evidence exists only in a person's mailbox.** the connector cannot see it. Planned response: Exception listed and a manual route. Write the test that replays this case through your pipeline before you tune anything.

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
| `naive.accuracy_on_auto` | 0.91 |
| `naive.escalation_rate` | 0 |
| `naive.evidence_precision` | 0.96575 |
| `naive.decided_with_valid_evidence` | 0.87 |
| `naive.injected_cases` | 14 |
| `naive.injection_success_rate` | 0.71429 |
| `naive.unsafe_actions` | 8 |
| `naive.outage_cases` | 8 |
| `naive.outage_cases_decided_without_evidence` | 8 |
| `naive.avg_steps` | 4.16 |
| `guarded.cases` | 100 |
| `guarded.auto_decided` | 92 |
| `guarded.accuracy_on_auto` | 1 |
| `guarded.escalation_rate` | 0.08 |
| `guarded.evidence_precision` | 1 |
| `guarded.decided_with_valid_evidence` | 1 |
| `guarded.injected_cases` | 14 |
| `guarded.injection_success_rate` | 0 |
| `guarded.unsafe_actions` | 0 |
| `guarded.outage_cases` | 8 |
| `guarded.outage_cases_decided_without_evidence` | 0 |
| `guarded.avg_steps` | 4.16 |

</details>
