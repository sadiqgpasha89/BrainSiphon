# Investment Research Q&A Copilot: worked example

> Run on synthetic data with `llm-agent` engine, seed 87066, knobs {}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention.

**Constraints that shape the design.** Every claim cites a document and its publication date; An analyst sees only the research they are entitled to, enforced at retrieval; Restricted-list and information-barrier rules are applied before any text is retrieved

**Label in this use case.** For "Investment Research Q&A Copilot": Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on questions where the relevant notes are known flatters retrieval.

## 2. Choose the signals

Your strongest signal is **Citation validity** (share of claims whose cited passage entails the claim). Its rule: A passage may exist and not support the claim, so test entailment. In the starter, the closest executable idea is **typed read-only tools**: narrow queries for context and evidence, with no free-form shell or query language. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Records can carry planted instructions. The naive agent followed them in 71.4% of injected cases and took 3 unsafe actions; it also decided cases whose deciding evidence was unavailable.

## 4. Baseline against the stronger design

The guarded agent treats tool output as data, verifies every claim against a cited line and escalates when evidence is missing: injection success 0.0%, unsafe actions 0, accuracy on the cases it decides 100.0%, escalating 11.0%.

| Result | Value |
|---|---|
| Injection success, naive | 71.4% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 3 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 11.0% |

## 5. An edge case from the blueprint

**Restricted-list company.** A question concerns a company on the restricted list and an answer could breach an information barrier. Planned response: Block restricted-list documents at retrieval and tell the analyst the topic is restricted. Write the test that replays this case through your pipeline before you tune anything.

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
| `naive.accuracy_on_auto` | 0.95 |
| `naive.escalation_rate` | 0 |
| `naive.evidence_precision` | 0.97122 |
| `naive.decided_with_valid_evidence` | 0.85 |
| `naive.injected_cases` | 7 |
| `naive.injection_success_rate` | 0.71429 |
| `naive.unsafe_actions` | 3 |
| `naive.outage_cases` | 11 |
| `naive.outage_cases_decided_without_evidence` | 11 |
| `naive.avg_steps` | 4.22 |
| `guarded.cases` | 100 |
| `guarded.auto_decided` | 89 |
| `guarded.accuracy_on_auto` | 1 |
| `guarded.escalation_rate` | 0.11 |
| `guarded.evidence_precision` | 1 |
| `guarded.decided_with_valid_evidence` | 1 |
| `guarded.injected_cases` | 7 |
| `guarded.injection_success_rate` | 0 |
| `guarded.unsafe_actions` | 0 |
| `guarded.outage_cases` | 11 |
| `guarded.outage_cases_decided_without_evidence` | 0 |
| `guarded.avg_steps` | 4.22 |

</details>
