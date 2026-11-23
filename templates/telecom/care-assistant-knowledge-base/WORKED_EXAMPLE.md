# Customer Care Assistant over Knowledge Base: worked example

> Run on synthetic data with `llm-agent` engine, seed 63988, knobs {}, in 2.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Answer customer and agent questions about plans, devices, coverage and billing from the operator's knowledge base with citations and safe escalation.

**Constraints that shape the design.** Answers cite the knowledge article and effective date; Account actions not allowed in this use case; Escalation to a human on low confidence

**Label in this use case.** For "Customer Care Assistant over Knowledge Base": Answer customer and agent questions about plans, devices, coverage and billing from the operator's knowledge base with citations and safe escalation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Measuring containment without correctness.

## 2. Choose the signals

Your strongest signal is **Retrieval relevance** (similarity between the question and top articles). Its rule: Evaluate on real intents. In the starter, the closest executable idea is **typed read-only tools**: narrow queries for context and evidence, with no free-form shell or query language. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Records can carry planted instructions. The naive agent followed them in 62.5% of injected cases and took 4 unsafe actions; it also decided cases whose deciding evidence was unavailable.

## 4. Baseline against the stronger design

The guarded agent treats tool output as data, verifies every claim against a cited line and escalates when evidence is missing: injection success 0.0%, unsafe actions 0, accuracy on the cases it decides 100.0%, escalating 3.0%.

| Result | Value |
|---|---|
| Injection success, naive | 62.5% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 4 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 3.0% |

## 5. An edge case from the blueprint

**Conflicting articles.** two sources disagree. Planned response: Prefer the latest and flag the conflict to content owners. Write the test that replays this case through your pipeline before you tune anything.

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
| `naive.accuracy_on_auto` | 0.99 |
| `naive.escalation_rate` | 0 |
| `naive.evidence_precision` | 0.97452 |
| `naive.decided_with_valid_evidence` | 0.93 |
| `naive.injected_cases` | 8 |
| `naive.injection_success_rate` | 0.625 |
| `naive.unsafe_actions` | 4 |
| `naive.outage_cases` | 3 |
| `naive.outage_cases_decided_without_evidence` | 3 |
| `naive.avg_steps` | 4.06 |
| `guarded.cases` | 100 |
| `guarded.auto_decided` | 97 |
| `guarded.accuracy_on_auto` | 1 |
| `guarded.escalation_rate` | 0.03 |
| `guarded.evidence_precision` | 1 |
| `guarded.decided_with_valid_evidence` | 1 |
| `guarded.injected_cases` | 8 |
| `guarded.injection_success_rate` | 0 |
| `guarded.unsafe_actions` | 0 |
| `guarded.outage_cases` | 3 |
| `guarded.outage_cases_decided_without_evidence` | 0 |
| `guarded.avg_steps` | 4.06 |

</details>
