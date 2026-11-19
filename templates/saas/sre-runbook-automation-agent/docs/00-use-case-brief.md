# SRE Runbook Automation Agent: use-case brief

> Generated from the blueprint `saas/sre-runbook-automation-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SRE Runbook Automation Agent · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Execute and suggest runbook steps for incidents with typed tools, approvals for risky actions and a full audit trail. The system has to run interactively, within a few seconds, inside these limits: Production safety, Human approval for mutations and Observability of agent actions.

**Why it is hard.** The obvious approach is autonomous remediation, and it fails because a wrong restart can worsen an outage. The second trap is in "Knowledge": the real signal is verified runbooks and past incidents, while teams usually reach for model's generic advice.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $3.79M a month. A mistake is expensive in the way toil hours saved measures it.

**What success looks like.** Offline: Plan correctness on replayed incidents and Unsafe-action rate. Online: Mean time to mitigate and Toil hours saved. The launch is judged on "Mean time to mitigate" while "Toil hours saved" must not get worse.

## Objective, loss and constraints

**Business objective.** Execute and suggest runbook steps for incidents with typed tools, approvals for risky actions and a full audit trail.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{incident})+\lambda\,\mathrm{UnsafeAction}`

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
| \text{incident} | The incident description and telemetry the agent reads. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UnsafeAction} | Penalty when the agent proposes a remediation that is risky or not allowed. |

**Hard constraints**

- Production safety
- Human approval for mutations
- Observability of agent actions
- Time-critical

## The approach in one paragraph

Start with static runbooks and chatops commands. Then earn the move to agent with typed SRE tools, runbook retrieval, risk-tiered approvals, dry-run and automatic post-action verification, and only if it beats the baseline on Plan correctness on replayed incidents and Unsafe-action rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Runbook match confidence | Retrieval relevance. Plan. Guard against: retrieval. |
| Add Action risk tier | Read, restart, scale, delete. Gate. Guard against: classification. |
| Add Post-action health check | Metrics recover after action. Verification. Guard against: monitors. |
| Run it as one pipeline | Incident alert (pager), Context gatherer (metrics logs traces), Runbook retriever (vector search), Planner agent (LLM), Typed ops tools (Kubernetes and cloud APIs) and Approval gate (on-call human), with Audit and learning off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle agent proposes restart during a data migration | Change-freeze and dependency checks before mutations. |

**Deliberately not doing**

- Chat verbosity: none.
- Number of tool calls: weak.

**How the approach is proven**

Prove it offline on Plan correctness on replayed incidents and Unsafe-action rate using time-ordered splits, then online on "Mean time to mitigate" with "Toil hours saved" as the guardrail. Watch for: Replay incidents lacking novelty and Measuring speed only.

## Baseline and production design

- **Baseline (build this first):** Static runbooks and chatops commands.
- **Production design:** Agent with typed SRE tools, runbook retrieval, risk-tiered approvals, dry-run and automatic post-action verification.

## Why AI, and why this kind

**Why AI.** Execute and suggest runbook steps for incidents with typed tools, approvals for risky actions and a full audit trail. The evidence that separates good from bad outcomes (Runbook match confidence, Action risk tier, Post-action health check) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "autonomous remediation" are what teams reach for first, and they fail because A wrong restart can worsen an outage. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Agent with typed SRE tools, runbook retrieval, risk-tiered approvals, dry-run and automatic post-action verification.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Runbook match confidence, Action risk tier, Post-action health check and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static runbooks and chatops commands | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Agent with typed SRE tools, runbook retrieval, risk-tiered approvals, dry-run and automatic post-action verification | chosen | Meets the 2500 ms envelope at $14.03 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to mitigate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replay incidents lacking novelty.
- Evaluation trap: Measuring speed only.
- Agent proposes restart during a data migration: corrupts the migration.
- Stale runbook: wrong remediation suggested.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
