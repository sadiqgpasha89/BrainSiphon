# Healthcare Regulatory Change Impact Assessment: use-case brief

> Generated from the blueprint `healthcare/healthcare-regulatory-change-impact-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Regulatory Change Impact Assessment · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Translate a confirmed regulatory change into the policies, controls, facilities, workflows, systems, owners, evidence and deadlines it affects, and draft a task plan with dependencies for the compliance owner to approve. The system has to run interactively, within a few seconds, inside these limits: The compliance owner approves scope, tasks and deadlines before any task is created, Workflow state is deterministic and the model only proposes impacts and Every impacted item cites its relationship and source.

**Why it is hard.** The obvious approach is free-text guess of what is affected, and it fails because a missed impact is a compliance gap. The second trap is in "Plan": the real signal is draft tasks with dependencies and owners, while teams usually reach for auto-created tasks.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.6K a month. A mistake is expensive in the way missed impacts found late measures it.

**What success looks like.** Offline: Impact recall and precision against expert-built impact maps, Task-plan acceptance rate and Deadline accuracy. Online: Time to approved implementation plan, Missed impacts found late and Planning effort per change. The launch is judged on "Time to approved implementation plan" while "Missed impacts found late" must not get worse.

## Objective, loss and constraints

**Business objective.** Translate a confirmed regulatory change into the policies, controls, facilities, workflows, systems, owners, evidence and deadlines it affects, and draft a task plan with dependencies for the compliance owner to approve.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{change record})+\lambda\,\mathrm{PolicyViolation}`

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
| \text{change record} | The approved change record and the retrieved policy, control and process passages the plan must be grounded in. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | A penalty when a draft, task or tool call breaks a permission, approval gate or citation rule. |

**Hard constraints**

- The compliance owner approves scope, tasks and deadlines before any task is created
- Workflow state is deterministic and the model only proposes impacts
- Every impacted item cites its relationship and source
- Agent tools are read-only plus draft tasks
- Documents are untrusted input
- Handles roughly 400 confirmed changes per year

## The approach in one paragraph

Start with a compliance lead builds an impact list in a spreadsheet after a meeting. Then earn the move to graph traversal over controls, policies, processes and facilities, retrieval for clause-level matching, and an LLM planner that drafts tasks through typed tools into a deterministic workflow with an approval gate, and only if it beats the baseline on Impact recall and precision against expert-built impact maps and Task-plan acceptance rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Graph distance to the changed requirement | Hops from the requirement to a policy, control or process. Ranks likely impact. Guard against: graph at assessment time. |
| Add Owner and facility scope | Facilities and owners connected to impacted nodes. Defines who acts. Guard against: directory as at assessment. |
| Add Prior-change similarity | Overlap with earlier changes and their actual impact. Calibrates the effort. Guard against: closed change projects. |
| Run it as one pipeline | Confirmed change intake (case system), Impact graph traversal (graph store), Clause-level matcher (retrieval), Task plan drafter (LLM with typed tools), Permission and policy guard (tool allow-list) and Compliance owner approval (human), with Workflow activation and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle stale knowledge graph | Graph freshness checks and a manual scope review. |

**Deliberately not doing**

- Change title wording: not impact.
- Owner seniority: not scope.
- Document formatting: layout.

**How the approach is proven**

Prove it offline on Impact recall and precision against expert-built impact maps, Task-plan acceptance rate and Deadline accuracy using time-ordered splits, then online on "Time to approved implementation plan" with "Missed impacts found late" as the guardrail. Watch for: Auto-creating tasks without approval, Letting the model compute dates and Trusting an outdated graph.

## Baseline and production design

- **Baseline (build this first):** A compliance lead builds an impact list in a spreadsheet after a meeting.
- **Production design:** Graph traversal over controls, policies, processes and facilities, retrieval for clause-level matching, and an LLM planner that drafts tasks through typed tools into a deterministic workflow with an approval gate.

## Why AI, and why this kind

**Why AI.** Translate a confirmed regulatory change into the policies, controls, facilities, workflows, systems, owners, evidence and deadlines it affects, and draft a task plan with dependencies for the compliance owner to approve. The evidence that separates good from bad outcomes (Graph distance to the changed requirement, Owner and facility scope, Prior-change similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-text guess of what is affected" are what teams reach for first, and they fail because A missed impact is a compliance gap. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Graph traversal over controls, policies, processes and facilities, retrieval for clause-level matching, and an LLM planner that drafts tasks through typed tools into a deterministic workflow with an approval gate.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Graph distance to the changed requirement, Owner and facility scope, Prior-change similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A compliance lead builds an impact list in a spreadsheet after a meeting | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Graph traversal over controls, policies, processes and facilities, retrieval for clause-level matching, and an LLM planner that drafts tasks through typed tools into a deterministic workflow with an approval gate | chosen | Meets the 2500 ms envelope at $11.44 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to approved implementation plan) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Auto-creating tasks without approval.
- Evaluation trap: Letting the model compute dates.
- Stale knowledge graph: impacts are missed.
- Change affects only some facilities: scope is too broad.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
