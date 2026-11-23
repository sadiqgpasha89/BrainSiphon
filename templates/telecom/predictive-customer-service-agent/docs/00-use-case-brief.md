# Predictive Customer Service Agent: use-case brief

> Generated from the blueprint `telecom/predictive-customer-service-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Customer Service Agent · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Spot customers whose service is degrading, work out the cause from network and account data and act first with a fix, a credit or a message, so many problems are resolved before the customer contacts care. The system has to run interactively, within a few seconds, inside these limits: Actions limited to a catalogue of approved remedies with cost limits, Credits above a threshold need human approval and Customers can opt out of proactive contact.

**Why it is hard.** The obvious approach is any low score, and it fails because low scores include people who simply use little. The second trap is in "Remedy": the real signal is a fix matched to the cause with a cost cap, while teams usually reach for a generic apology credit.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $128.2K a month. A mistake is expensive in the way credit cost per avoided contact measures it.

**What success looks like.** Offline: Cause attribution accuracy on audited cases, Remedy appropriateness rating and Opt-out compliance rate. Online: Contacts avoided per 1000 customers, Credit cost per avoided contact and Satisfaction after proactive contact. The launch is judged on "Contacts avoided per 1000 customers" while "Credit cost per avoided contact" must not get worse.

## Objective, loss and constraints

**Business objective.** Spot customers whose service is degrading, work out the cause from network and account data and act first with a fix, a credit or a message, so many problems are resolved before the customer contacts care.

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

- Actions limited to a catalogue of approved remedies with cost limits
- Credits above a threshold need human approval
- Customers can opt out of proactive contact
- All actions and reasons visible to care agents
- 2M subscriber evaluations per hour

## The approach in one paragraph

Start with a rules engine that triggers a message when a customer's cell has an open outage, because it is simple and shows the reach of a basic approach. Then earn the move to an agent that reads the experience score, attributes the cause with read-only tools and chooses from approved remedies with cost limits, writing every action to the case with the reason and a human approval gate above thresholds, and only if it beats the baseline on Cause attribution accuracy on audited cases and Remedy appropriateness rating after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Experience score trend | Change in per-customer throughput, drops and latency over 7 days. Early sign of harm. Guard against: join to the customer's serving cells. |
| Add Cause attribution | Whether degradation links to a cell fault, device or plan limit. Chooses the remedy. Guard against: needs network and device data. |
| Add Prior contacts | Contacts about the same issue in 30 days. Avoids repeats. Guard against: from CRM as at action time. |
| Run it as one pipeline | Experience scoring (batch and streaming features), Cause attribution (rules and gradient boosting), Remedy selection (agent with a remedy catalogue), Cost and consent gate (policy engine), Action execution (CRM and messaging tools) and Outcome tracking (contact join), with Case note and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle false degradation | Require corroboration from two signals before acting. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Handset colour: no link to service.
- Time since last bill: weak link.

**How the approach is proven**

Prove it offline on Cause attribution accuracy on audited cases, Remedy appropriateness rating and Opt-out compliance rate using time-ordered splits, then online on "Contacts avoided per 1000 customers" with "Credit cost per avoided contact" as the guardrail. Watch for: Counting avoided calls without a control, Unlimited credits and Ignoring opt-outs.

## Baseline and production design

- **Baseline (build this first):** A rules engine that triggers a message when a customer's cell has an open outage, because it is simple and shows the reach of a basic approach.
- **Production design:** An agent that reads the experience score, attributes the cause with read-only tools and chooses from approved remedies with cost limits, writing every action to the case with the reason and a human approval gate above thresholds.

## Why AI, and why this kind

**Why AI.** Spot customers whose service is degrading, work out the cause from network and account data and act first with a fix, a credit or a message, so many problems are resolved before the customer contacts care. The evidence that separates good from bad outcomes (Experience score trend, Cause attribution, Prior contacts) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any low score" are what teams reach for first, and they fail because low scores include people who simply use little. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An agent that reads the experience score, attributes the cause with read-only tools and chooses from approved remedies with cost limits, writing every action to the case with the reason and a human approval gate above thresholds.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Experience score trend, Cause attribution, Prior contacts and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rules engine that triggers a message when a customer's cell has an open outage, because it is simple and shows the reach of a basic approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An agent that reads the experience score, attributes the cause with read-only tools and chooses from approved remedies with cost limits, writing every action to the case with the reason and a human approval gate above thresholds | chosen | Meets the 2500 ms envelope at $4.75 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Contacts avoided per 1000 customers) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting avoided calls without a control.
- Evaluation trap: Unlimited credits.
- False degradation: measurement glitch looks like harm.
- Customer already contacted: duplicate outreach.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
