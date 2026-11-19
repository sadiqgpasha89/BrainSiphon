# AI Agent Tool-Permission & Policy Guardrails: how well the starter fits

> Generated from the blueprint `cybersecurity/ai-agent-tool-permission-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `llm-agent` (Tool-using agent with guardrails and a verifier) · **Fit:** adaptable · **Problem type:** `agentic-write-actions`

The `llm-agent` engine implements a neighbouring problem. This use case is `agentic-write-actions`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

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

- Replace the scripted planner with a model-driven planner behind the same typed tool interface and step budget
- Add the product operations the use case must perform as typed write tools, authorised on behalf of the signed-in user with that user's own permissions, and keep the approval token in front of every write
- Add execution verification: read the system state back after each write, confirm the intended change happened, and reverse it (or compensate) when it did not
- Extend the replay set with write scenarios, partial failures and permission denials, and keep the planted-instruction tests
- Score "Unsafe action block rate and benign pass rate on red-team traces" and "Decision latency" instead of the kit metrics
- Replace the synthetic data (Cases, evidence lines, tools, verdicts, approvals and indicators) with data of the shape this use case has; rename every column and keep the generator's trap tests
- Replace the kit's models with the blueprint's: Policy decision point combining capability scopes, intent-consistency model and sensitivity checks…
- Typed write tools authorised on the user's behalf, with execution verification and reversal: the kit only simulates an approval token

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Agent that performs authorised actions: Authorise every agent tool call against user intent, data sensitivity and least privilege in real time, blocking unsafe or out-of-scope actions | Agent with read-only tools | adapt | The kit implements agent with read-only tools; this use case is agent that performs authorised actions. Only the reusable parts carry over (see the modifications) |
| label | An action carried out on a person's behalf through product or enterprise APIs, verified after execution | Every case carries a verdict and the evidence lines that decide it; correct means the verdict matches, every claim cites a real supporting line and the agent escalates when the deciding lines are unavailable | adapt | Define the label this use case really has before writing any code; the kit label does not describe it |
| validation | Replay of tasks with write scenarios, partial failures, permission denials and planted instructions | Replay set with planted instructions, tool outages and missing evidence; permission and approval tests | adapt | Use the validation method named here, not the kit split, which is built for the kit label |
| metrics | Unsafe action block rate and benign pass rate on red-team traces; Decision latency | Verdict accuracy, injection success, unsafe actions and honest escalation | adapt | Score "Unsafe action block rate and benign pass rate on red-team traces" and "Decision latency" instead of the kit metrics |
| data | Tasks, user permissions and system state before and after | Replayed investigation cases with evidence lines and untrusted fields | adapt | Replace the synthetic data (Cases, evidence lines, tools, verdicts, approvals and indicators) with data of the shape this use case has; rename every column and keep the generator's trap tests |
| model | Baseline: Static allow-lists of tools per agent. Production: Policy decision point combining capability scopes, intent-consistency model and sensitivity checks with human… | A scripted planner with typed read-only tools, an approval gate for writes and a claim verifier, with a deterministic stand-in for the language model | adapt | Replace the kit's models with the blueprint's: Policy decision point combining capability scopes, intent-consistency model and sensitivity checks… |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline harness only: no agent runtime, queue, identity or tool gateway | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Human approval (high-risk path): a person in the loop; Decision audit (log); writes to product systems | None. Read-only tools over synthetic cases; the approval token is simulated and no real system is written to | adapt | Typed write tools authorised on the user's behalf, with execution verification and reversal: the kit only simulates an approval token |
