# Model Risk Validation Assistant: how well the starter fits

> Generated from the blueprint `bfsi/model-risk-validation-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `llm-agent` (Tool-using agent with guardrails and a verifier) · **Fit:** adaptable · **Problem type:** `agentic-read-only`

The `llm-agent` engine implements a neighbouring problem. This use case is `agentic-read-only`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Treating tool output as instructions
- Judging by accuracy alone
- Guessing when evidence is missing
- Tuning on the replay set you report

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Score "Finding precision and recall against validator findings" and "Citation validity" instead of the kit metrics

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Agent with read-only tools: Assist model validators by checking documentation against policy, reproducing key tests and drafting findings, with the validator remaining accountable | Agent with read-only tools | match |  |
| label | A verdict or recommendation with cited evidence gathered through read-only tools | Every case carries a verdict and the evidence lines that decide it; correct means the verdict matches, every claim cites a real supporting line and the agent escalates when the deciding lines are unavailable | match |  |
| validation | Replay set of cases with tool outages, missing evidence and planted instructions | Replay set with planted instructions, tool outages and missing evidence; permission and approval tests | match |  |
| metrics | Finding precision and recall against validator findings; Citation validity | Verdict accuracy, injection success, unsafe actions and honest escalation | adapt | Score "Finding precision and recall against validator findings" and "Citation validity" instead of the kit metrics |
| data | Cases with evidence records | Replayed investigation cases with evidence lines and untrusted fields | match |  |
| model | Baseline: Manual checklist-based validation by teams, because it is the current process. Production: A planner-executor agent with sandboxed code tools, retrieval over policy and documentation, a citation verif… | A scripted planner with typed read-only tools, an approval gate for writes and a claim verifier, with a deterministic stand-in for the language model | match |  |
| serving | Interactive response in seconds (p99 2500 ms) | Offline harness only: no agent runtime, queue, identity or tool gateway | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Document retriever (hybrid search); Validator review (workflow): a person in the loop; Evidence archive (immutable store) | None. Read-only tools over synthetic cases; the approval token is simulated and no real system is written to | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
