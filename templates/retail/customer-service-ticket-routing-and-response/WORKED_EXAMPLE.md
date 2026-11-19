# Customer Service Ticket Routing & Draft Replies: worked example

> Run on synthetic data with `llm-agent` engine, seed 70986, knobs {}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Route tickets to the right queue, detect urgency and draft policy-correct replies so agents resolve contacts faster.

**Constraints that shape the design.** Policy-accurate refunds; PII masked; Agent final approval

**Label in this use case.** For "Customer Service Ticket Routing & Draft Replies": Route tickets to the right queue, detect urgency and draft policy-correct replies so agents resolve contacts faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Measuring CSAT from biased respondents.

## 2. Choose the signals

Your strongest signal is **Order-state context** (status, delivery, refund eligibility). Its rule: Fetch live. In the starter, the closest executable idea is **typed read-only tools**: narrow queries for context and evidence, with no free-form shell or query language. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Records can carry planted instructions. The naive agent followed them in 83.3% of injected cases and took 5 unsafe actions; it also decided cases whose deciding evidence was unavailable.

## 4. Baseline against the stronger design

The guarded agent treats tool output as data, verifies every claim against a cited line and escalates when evidence is missing: injection success 0.0%, unsafe actions 0, accuracy on the cases it decides 100.0%, escalating 10.0%.

| Result | Value |
|---|---|
| Injection success, naive | 83.3% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 5 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 10.0% |

## 5. An edge case from the blueprint

**Refund policy changes mid-week.** drafts cite old rules. Planned response: Policy versioning and retrieval by effective date. Write the test that replays this case through your pipeline before you tune anything.

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
| `naive.accuracy_on_auto` | 0.98 |
| `naive.escalation_rate` | 0 |
| `naive.evidence_precision` | 0.99306 |
| `naive.decided_with_valid_evidence` | 0.89 |
| `naive.injected_cases` | 6 |
| `naive.injection_success_rate` | 0.83333 |
| `naive.unsafe_actions` | 5 |
| `naive.outage_cases` | 10 |
| `naive.outage_cases_decided_without_evidence` | 10 |
| `naive.avg_steps` | 4.2 |
| `guarded.cases` | 100 |
| `guarded.auto_decided` | 90 |
| `guarded.accuracy_on_auto` | 1 |
| `guarded.escalation_rate` | 0.1 |
| `guarded.evidence_precision` | 1 |
| `guarded.decided_with_valid_evidence` | 1 |
| `guarded.injected_cases` | 6 |
| `guarded.injection_success_rate` | 0 |
| `guarded.unsafe_actions` | 0 |
| `guarded.outage_cases` | 10 |
| `guarded.outage_cases_decided_without_evidence` | 0 |
| `guarded.avg_steps` | 4.2 |

</details>
