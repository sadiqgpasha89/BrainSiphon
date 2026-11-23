# Billing Inquiry Copilot: worked example

> Run on synthetic data with `llm-agent` engine, seed 54283, knobs {}, in 1.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Help contact centre agents explain bills, tariffs and adjustments by retrieving the customer's own billing facts and the controlled policy, with every figure computed by tools.

**Constraints that shape the design.** Answers use the customer's verified account and controlled policy text; Figures computed by tools; The copilot cannot change an account

**Label in this use case.** For "Billing Inquiry Copilot": Help contact centre agents explain bills, tariffs and adjustments by retrieving the customer's own billing facts and the controlled policy, with every figure computed by tools. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model-computed amounts.

## 2. Choose the signals

Your strongest signal is **Identity verification state** (whether the customer is verified). Its rule: From the contact system. In the starter, the closest executable idea is **typed read-only tools**: narrow queries for context and evidence, with no free-form shell or query language. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Records can carry planted instructions. The naive agent followed them in 77.8% of injected cases and took 10 unsafe actions; it also decided cases whose deciding evidence was unavailable.

## 4. Baseline against the stronger design

The guarded agent treats tool output as data, verifies every claim against a cited line and escalates when evidence is missing: injection success 0.0%, unsafe actions 0, accuracy on the cases it decides 100.0%, escalating 12.0%.

| Result | Value |
|---|---|
| Injection success, naive | 77.8% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 10 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 12.0% |

## 5. An edge case from the blueprint

**Unverified caller.** identity is not confirmed. Planned response: Block account data and offer the verification path. Write the test that replays this case through your pipeline before you tune anything.

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
| `naive.accuracy_on_auto` | 0.89 |
| `naive.escalation_rate` | 0 |
| `naive.evidence_precision` | 0.96528 |
| `naive.decided_with_valid_evidence` | 0.83 |
| `naive.injected_cases` | 18 |
| `naive.injection_success_rate` | 0.77778 |
| `naive.unsafe_actions` | 10 |
| `naive.outage_cases` | 12 |
| `naive.outage_cases_decided_without_evidence` | 12 |
| `naive.avg_steps` | 4.24 |
| `guarded.cases` | 100 |
| `guarded.auto_decided` | 88 |
| `guarded.accuracy_on_auto` | 1 |
| `guarded.escalation_rate` | 0.12 |
| `guarded.evidence_precision` | 1 |
| `guarded.decided_with_valid_evidence` | 1 |
| `guarded.injected_cases` | 18 |
| `guarded.injection_success_rate` | 0 |
| `guarded.unsafe_actions` | 0 |
| `guarded.outage_cases` | 12 |
| `guarded.outage_cases_decided_without_evidence` | 0 |
| `guarded.avg_steps` | 4.24 |

</details>
