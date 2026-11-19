# Incident Response Playbook Agent: use-case brief

> Generated from the blueprint `cybersecurity/incident-response-playbook-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Incident Response Playbook Agent · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Execute and adapt incident-response playbooks (contain, collect, notify) with human approval gates for destructive actions. The system has to run interactively, within a few seconds, inside these limits: Destructive actions need approval, Idempotent steps and Complete audit.

**Why it is hard.** The obvious approach is fully autonomous containment, and it fails because a wrong isolation can take down production. The second trap is in "Determinism": the real signal is playbook steps as typed tools with preconditions, while teams usually reach for free-form commands.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $25.24M a month. A mistake is expensive in the way analyst hours saved measures it.

**What success looks like.** Offline: Playbook step accuracy on replayed incidents and Unsafe-action rate. Online: Mean time to contain and Analyst hours saved. The launch is judged on "Mean time to contain" while "Analyst hours saved" must not get worse.

## Objective, loss and constraints

**Business objective.** Execute and adapt incident-response playbooks (contain, collect, notify) with human approval gates for destructive actions.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{case})+\lambda\,\mathrm{UnsafeAction}`

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
| \text{case} | The incident case details the agent reads to decide the next steps. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UnsafeAction} | Penalty when the agent proposes a response action that is disruptive or not permitted. |

**Hard constraints**

- Destructive actions need approval
- Idempotent steps
- Complete audit
- Time-critical

## The approach in one paragraph

Start with static SOAR playbooks. Then earn the move to agent that selects and parameterises playbook steps as typed tools, with risk-tiered approvals, dry-run previews and rollback plans, and only if it beats the baseline on Playbook step accuracy on replayed incidents and Unsafe-action rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Action risk tier | Read, reversible, destructive. Gate. Guard against: classification. |
| Add Precondition checks | State verified before action. Safety. Guard against: tool checks. |
| Add Rollback availability | Action has rollback. Risk. Guard against: metadata. |
| Run it as one pipeline | Incident context (case system), Planner agent (LLM), Typed response tools (EDR IdP firewall), Risk gate (approval policy) and Incident commander (human), with Dry-run previewer and Audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle misidentified host leads to isolation of a production server | Asset-criticality preconditions and mandatory approval for critical assets. |

**Deliberately not doing**

- Agent narrative: none.
- Number of steps: weak.

**How the approach is proven**

Prove it offline on Playbook step accuracy on replayed incidents and Unsafe-action rate using time-ordered splits, then online on "Mean time to contain" with "Analyst hours saved" as the guardrail. Watch for: Replay incidents lacking messy reality and Measuring speed over safety.

## Baseline and production design

- **Baseline (build this first):** Static SOAR playbooks.
- **Production design:** Agent that selects and parameterises playbook steps as typed tools, with risk-tiered approvals, dry-run previews and rollback plans.

## Why AI, and why this kind

**Why AI.** Execute and adapt incident-response playbooks (contain, collect, notify) with human approval gates for destructive actions. The evidence that separates good from bad outcomes (Action risk tier, Precondition checks, Rollback availability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fully autonomous containment" are what teams reach for first, and they fail because A wrong isolation can take down production. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Agent that selects and parameterises playbook steps as typed tools, with risk-tiered approvals, dry-run previews and rollback plans.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Action risk tier, Precondition checks, Rollback availability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static SOAR playbooks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Agent that selects and parameterises playbook steps as typed tools, with risk-tiered approvals, dry-run previews and rollback plans | chosen | Meets the 2500 ms envelope at $14.02 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to contain) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replay incidents lacking messy reality.
- Evaluation trap: Measuring speed over safety.
- Misidentified host leads to isolation of a production server: a wrongly identified host is isolated and a production service goes down.
- Tool returns stale state: action based on wrong facts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
