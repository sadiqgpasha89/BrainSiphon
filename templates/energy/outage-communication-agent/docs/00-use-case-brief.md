# Outage Communication Agent: use-case brief

> Generated from the blueprint `energy/outage-communication-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Outage Communication Agent · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer customer questions about outages and estimated restoration times from the outage system and keep status pages and messages current, without promising times the operator has not confirmed. The system has to run interactively, within a few seconds, inside these limits: Estimates come from the outage management system and are labelled as estimates, The agent cannot create or alter outage records and Vulnerable customer flags trigger a human callback.

**Why it is hard.** The obvious approach is model guesses, and it fails because a wrong time breaks trust and affects safety. The second trap is in "Honesty": the real signal is estimates labelled with a confidence range, while teams usually reach for a single promise.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way repeat contacts measures it.

**What success looks like.** Offline: Answer accuracy against the OMS, Escalation recall and Estimate wording faithfulness. Online: Calls during storms, Repeat contacts and Customer satisfaction after outages. The launch is judged on "Calls during storms" while "Repeat contacts" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer customer questions about outages and estimated restoration times from the outage system and keep status pages and messages current, without promising times the operator has not confirmed.

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

- Estimates come from the outage management system and are labelled as estimates
- The agent cannot create or alter outage records
- Vulnerable customer flags trigger a human callback
- Replies within 3 s
- Handles 500K contacts during a storm

## The approach in one paragraph

Start with a static outage map and an interactive voice menu, because they are the current channels. Then earn the move to a retrieval-grounded assistant with live outage data that answers, subscribes customers to updates and escalates priority cases, with templates for all promises about time, and only if it beats the baseline on Answer accuracy against the OMS and Escalation recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Outage record status | Cause, crew status and estimate. Answer content. Guard against: from the OMS. |
| Add Customer location match | Whether the address is in the affected area. Relevance. Guard against: from GIS. |
| Add Estimate confidence | How reliable the estimate is. Wording. Guard against: from the OMS. |
| Run it as one pipeline | Contact intake (chat and phone), Address resolution (GIS), Outage lookup (OMS API), Answer draft (LLM with templates), Priority routing (rules) and Update subscription (messaging), with Quality review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle estimate change | Proactive updates and no old promises. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Message length: not importance.
- Social post tone: not facts.

**How the approach is proven**

Prove it offline on Answer accuracy against the OMS, Escalation recall and Estimate wording faithfulness using time-ordered splits, then online on "Calls during storms" with "Repeat contacts" as the guardrail. Watch for: Model-made restoration times, Writing to outage records and No priority routing.

## Baseline and production design

- **Baseline (build this first):** A static outage map and an interactive voice menu, because they are the current channels.
- **Production design:** A retrieval-grounded assistant with live outage data that answers, subscribes customers to updates and escalates priority cases, with templates for all promises about time.

## Why AI, and why this kind

**Why AI.** Answer customer questions about outages and estimated restoration times from the outage system and keep status pages and messages current, without promising times the operator has not confirmed. The evidence that separates good from bad outcomes (Outage record status, Customer location match, Estimate confidence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model guesses" are what teams reach for first, and they fail because A wrong time breaks trust and affects safety. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval-grounded assistant with live outage data that answers, subscribes customers to updates and escalates priority cases, with templates for all promises about time.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Outage record status, Customer location match, Estimate confidence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A static outage map and an interactive voice menu, because they are the current channels | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval-grounded assistant with live outage data that answers, subscribes customers to updates and escalates priority cases, with templates for all promises about time | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Calls during storms) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model-made restoration times.
- Evaluation trap: Writing to outage records.
- Estimate change: the restoration time moves.
- Unknown address: the address does not match.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
