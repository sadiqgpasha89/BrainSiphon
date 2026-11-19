# In-App AI Copilot for SaaS Products: use-case brief

> Generated from the blueprint `saas/in-app-ai-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** In-App AI Copilot for SaaS Products · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Let users accomplish tasks in the product through natural language, with the copilot calling product APIs safely on their behalf. The system has to run interactively, within a few seconds, inside these limits: Respect user permissions, Confirm destructive actions and Tenant isolation.

**Why it is hard.** The obvious approach is service-account superuser, and it fails because a hijacked copilot must not exceed the user's rights. The second trap is in "Reliability": the real signal is typed tools with validation and dry-run, while teams usually reach for free-form API calls.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $1.78M a month. A mistake is expensive in the way support tickets avoided measures it.

**What success looks like.** Offline: Task success on golden tasks and Tool-call validity. Online: Feature adoption via copilot and Support tickets avoided. The launch is judged on "Feature adoption via copilot" while "Support tickets avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Let users accomplish tasks in the product through natural language, with the copilot calling product APIs safely on their behalf.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{context,tools})+\lambda\,\mathrm{UnsafeAction}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{context,tools} | The state of the app and the tools the copilot may use. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UnsafeAction} | Penalty when the copilot proposes an action that is destructive or not permitted. |

**Hard constraints**

- Respect user permissions
- Confirm destructive actions
- Tenant isolation
- Cost per user per month
- User short-lived OAuth2 or OIDC token (RFC 8693 exchange) passed through to every product API
- Mutations follow plan, preview, commit with idempotency keys

## The approach in one paragraph

Start with help articles and static onboarding tours. Then earn the move to planner agent over typed product tools with permission-scoped tokens, dry-run previews, confirmations for state changes and cost-aware model routing. User tokens are exchanged (RFC 8693) and passed through the orchestrator to product APIs, and mutations use plan-preview-commit with signed confirmations and idempotency keys, and only if it beats the baseline on Task success on golden tasks and Tool-call validity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Tool-call validity rate | Calls passing schema validation. Reliability. Guard against: schemas. |
| Add Task success rate | Tasks completed as intended. Value. Guard against: instrumentation. |
| Add Confirmation acceptance | User approvals of previews. Safety. Guard against: uI. |
| Run it as one pipeline | User request (in-app chat), Context builder (page and entity context), Planner LLM (tool-calling), Tool gateway (typed APIs with scopes) and Execution (product API), with Preview and confirm and Audit and feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous request deletes the wrong object | Dry-run previews, confirmations and soft-delete. |

**Deliberately not doing**

- Chat turns: not success.
- Response length: weak.

**How the approach is proven**

Prove it offline on Task success on golden tasks and Tool-call validity using time-ordered splits, then online on "Feature adoption via copilot" with "Support tickets avoided" as the guardrail. Watch for: Golden tasks too easy and Ignoring permission edge cases.

## Baseline and production design

- **Baseline (build this first):** Help articles and static onboarding tours.
- **Production design:** Planner agent over typed product tools with permission-scoped tokens, dry-run previews, confirmations for state changes and cost-aware model routing. User tokens are exchanged (RFC 8693) and passed through the orchestrator to product APIs, and mutations use plan-preview-commit with signed confirmations and idempotency keys.

## Why AI, and why this kind

**Why AI.** Let users accomplish tasks in the product through natural language, with the copilot calling product APIs safely on their behalf. The evidence that separates good from bad outcomes (Tool-call validity rate, Task success rate, Confirmation acceptance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "service-account superuser" are what teams reach for first, and they fail because A hijacked copilot must not exceed the user's rights. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Planner agent over typed product tools with permission-scoped tokens, dry-run previews, confirmations for state changes and cost-aware model routing. User tokens are exchanged (RFC 8693) and passed through the orchestrator to product APIs, and mutations use plan-preview-commit with signed confirmations and idempotency keys.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Tool-call validity rate, Task success rate, Confirmation acceptance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Help articles and static onboarding tours | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Planner agent over typed product tools with permission-scoped tokens, dry-run previews, confirmations for state changes and cost-aware model routing. User tokens are exchanged (RFC 8693) and passed through the orchestrator to product APIs, and mutations use plan-preview-commit with signed confirmations and idempotency keys | chosen | Meets the 2500 ms envelope at $6.59 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Feature adoption via copilot) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Golden tasks too easy.
- Evaluation trap: Ignoring permission edge cases.
- Ambiguous request deletes the wrong object: an ambiguous request makes the copilot delete the wrong object and cause data loss.
- Tenant data leaks via retrieval: cross-customer exposure.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
