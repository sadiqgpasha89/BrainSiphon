# Billing Dispute Resolution Agent: use-case brief

> Generated from the blueprint `telecom/billing-dispute-resolution-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Billing Dispute Resolution Agent · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Investigate a billing dispute, check the rated usage and rules, explain the charge or propose a correction and credit within policy, so disputes resolve faster and more consistently. The system has to run interactively, within a few seconds, inside these limits: Credits and corrections follow a policy table with caps, Anything above a cap or involving legal threats goes to a human and The explanation cites the rated records.

**Why it is hard.** The obvious approach is the customer's description, and it fails because memory of the plan is often wrong. The second trap is in "Policy": the real signal is a table of allowed corrections with caps, while teams usually reach for case-by-case discretion.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way disputes reopened measures it.

**What success looks like.** Offline: Resolution correctness against specialist review, Policy compliance rate and Explanation faithfulness. Online: Time to resolve, Disputes reopened and Credits outside policy. The launch is judged on "Time to resolve" while "Disputes reopened" must not get worse.

## Objective, loss and constraints

**Business objective.** Investigate a billing dispute, check the rated usage and rules, explain the charge or propose a correction and credit within policy, so disputes resolve faster and more consistently.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

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
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Credits and corrections follow a policy table with caps
- Anything above a cap or involving legal threats goes to a human
- The explanation cites the rated records
- No changes to the bill without approval
- Investigation completed within 60 s

## The approach in one paragraph

Start with a decision tree on dispute type and amount with a standard credit, because it is the starting point for consistency. Then earn the move to an agent with read tools for rated records, plan history and policy and a write tool for correction proposals with caps, producing an explanation with citations and routing complex cases to people, and only if it beats the baseline on Resolution correctness against specialist review and Policy compliance rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rated record match | Whether the disputed charge maps to a rated record and rule. Validity of the charge. Guard against: needs a rule trace from rating. |
| Add Rate plan history | Plan and promotion in force on the date. Detects wrong plans. Guard against: full history needed. |
| Add Similar case outcomes | Outcomes for matching dispute types. Consistency. Guard against: approved outcomes only. |
| Run it as one pipeline | Dispute intake (care channels), Record retrieval (billing read tools), Rule trace and plan check (rating engine), Resolution proposal (agent with policy table), Approval gate (policy engine) and Correction and message (billing and messaging), with Audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle charge is valid | Explain with the records and offer a review path. |

**Deliberately not doing**

- Customer tone: not evidence.
- Time of day: weak link.
- Agent identifier: irrelevant.

**How the approach is proven**

Prove it offline on Resolution correctness against specialist review, Policy compliance rate and Explanation faithfulness using time-ordered splits, then online on "Time to resolve" with "Disputes reopened" as the guardrail. Watch for: Letting the agent edit bills freely, Case-by-case discretion and Ignoring systemic billing errors.

## Baseline and production design

- **Baseline (build this first):** A decision tree on dispute type and amount with a standard credit, because it is the starting point for consistency.
- **Production design:** An agent with read tools for rated records, plan history and policy and a write tool for correction proposals with caps, producing an explanation with citations and routing complex cases to people.

## Why AI, and why this kind

**Why AI.** Investigate a billing dispute, check the rated usage and rules, explain the charge or propose a correction and credit within policy, so disputes resolve faster and more consistently. The evidence that separates good from bad outcomes (Rated record match, Rate plan history, Similar case outcomes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the customer's description" are what teams reach for first, and they fail because memory of the plan is often wrong. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An agent with read tools for rated records, plan history and policy and a write tool for correction proposals with caps, producing an explanation with citations and routing complex cases to people.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rated record match, Rate plan history, Similar case outcomes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A decision tree on dispute type and amount with a standard credit, because it is the starting point for consistency | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An agent with read tools for rated records, plan history and policy and a write tool for correction proposals with caps, producing an explanation with citations and routing complex cases to people | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to resolve) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the agent edit bills freely.
- Evaluation trap: Case-by-case discretion.
- Charge is valid: the customer disagrees.
- Billing error found: many customers are affected.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
