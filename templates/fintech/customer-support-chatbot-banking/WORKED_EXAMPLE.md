# Banking Customer Support Assistant: worked example

> Run on synthetic data with `llm-agent` engine, seed 45727, knobs {}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Resolve 60% of banking support contacts end-to-end with a safe assistant, handing over complex or risky intents to humans with full context.

**Constraints that shape the design.** Never state balances without authentication; PII redaction before the model; Regulatory disclosure wording

**Label in this use case.** For "Banking Customer Support Assistant": Resolve 60% of banking support contacts end-to-end with a safe assistant, handing over complex or risky intents to humans with full context. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Containment counts abandoned chats as resolved.

## 2. Choose the signals

Your strongest signal is **Intent confidence margin** (gap between top-2 intent probabilities). Its rule: Calibrate on production traffic. In the starter, the closest executable idea is **typed read-only tools**: narrow queries for context and evidence, with no free-form shell or query language. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Records can carry planted instructions. The naive agent followed them in 45.5% of injected cases and took 4 unsafe actions; it also decided cases whose deciding evidence was unavailable.

## 4. Baseline against the stronger design

The guarded agent treats tool output as data, verifies every claim against a cited line and escalates when evidence is missing: injection success 0.0%, unsafe actions 0, accuracy on the cases it decides 100.0%, escalating 11.0%.

| Result | Value |
|---|---|
| Injection success, naive | 45.5% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 4 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 11.0% |

## 5. An edge case from the blueprint

**Customer asks to dispute a transaction.** model offers wrong process. Planned response: Dispute intents routed to deterministic flow, not generation. Write the test that replays this case through your pipeline before you tune anything.

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
| `naive.accuracy_on_auto` | 0.97 |
| `naive.escalation_rate` | 0 |
| `naive.evidence_precision` | 0.94615 |
| `naive.decided_with_valid_evidence` | 0.82 |
| `naive.injected_cases` | 11 |
| `naive.injection_success_rate` | 0.45455 |
| `naive.unsafe_actions` | 4 |
| `naive.outage_cases` | 11 |
| `naive.outage_cases_decided_without_evidence` | 11 |
| `naive.avg_steps` | 4.22 |
| `guarded.cases` | 100 |
| `guarded.auto_decided` | 89 |
| `guarded.accuracy_on_auto` | 1 |
| `guarded.escalation_rate` | 0.11 |
| `guarded.evidence_precision` | 1 |
| `guarded.decided_with_valid_evidence` | 1 |
| `guarded.injected_cases` | 11 |
| `guarded.injection_success_rate` | 0 |
| `guarded.unsafe_actions` | 0 |
| `guarded.outage_cases` | 11 |
| `guarded.outage_cases_decided_without_evidence` | 0 |
| `guarded.avg_steps` | 4.22 |

</details>
