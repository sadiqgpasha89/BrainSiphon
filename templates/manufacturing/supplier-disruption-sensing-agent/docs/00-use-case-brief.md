# Supplier Disruption Sensing Agent: use-case brief

> Generated from the blueprint `manufacturing/supplier-disruption-sensing-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supplier Disruption Sensing Agent · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Watch news, weather, port and supplier signals for events that threaten critical inputs, link them to affected parts and orders, and brief the buyers with options. The system has to run interactively, within a few seconds, inside these limits: Every alert cites its sources, Impact tied to the bill of materials and open orders and The agent proposes and never places orders.

**Why it is hard.** The obvious approach is unverified social posts, and it fails because rumours trigger unnecessary actions. The second trap is in "Linkage": the real signal is events mapped to supplier sites, lanes and parts, while teams usually reach for headlines only.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $23.8K a month. A mistake is expensive in the way expedite cost measures it.

**What success looks like.** Offline: Precision and recall of relevant events, Impact accuracy on past disruptions and Citation faithfulness. Online: Lead time before disruption impact, Expedite cost and Alerts dismissed as irrelevant. The launch is judged on "Lead time before disruption impact" while "Expedite cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Watch news, weather, port and supplier signals for events that threaten critical inputs, link them to affected parts and orders, and brief the buyers with options.

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

- Every alert cites its sources
- Impact tied to the bill of materials and open orders
- The agent proposes and never places orders
- High-impact alerts reviewed by a person within 1 hour
- Scans 2M items per day

## The approach in one paragraph

Start with a keyword alert on supplier names and regions, because purchasing already uses it. Then earn the move to an agent that ingests events, resolves them to supplier sites and parts with read-only tools, computes inventory cover and drafts a briefing with options for buyers, and only if it beats the baseline on Precision and recall of relevant events and Impact accuracy on past disruptions after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Event location match | Whether the event area contains a supplier site or lane. Relevance. Guard against: needs supplier geocodes. |
| Add Part criticality | Single-source and downtime cost of affected parts. Priority. Guard against: from the bill of materials. |
| Add Inventory cover | Days of stock for the affected parts. Urgency. Guard against: from ERP. |
| Run it as one pipeline | Event ingestion (news and weather feeds), Entity and location resolution (NER and geocoding), Supply link (BOM and supplier graph), Impact estimate (inventory cover model), Brief draft (LLM with citations) and Outcome tracking (analytics), with Buyer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle duplicate reports | Event clustering and a single brief. |

**Deliberately not doing**

- Headline wording: not impact.
- Social media volume: not reliability.
- Article length: not relevance.

**How the approach is proven**

Prove it offline on Precision and recall of relevant events, Impact accuracy on past disruptions and Citation faithfulness using time-ordered splits, then online on "Lead time before disruption impact" with "Expedite cost" as the guardrail. Watch for: Alerting on headlines, Letting the agent place orders and Unverified sources.

## Baseline and production design

- **Baseline (build this first):** A keyword alert on supplier names and regions, because purchasing already uses it.
- **Production design:** An agent that ingests events, resolves them to supplier sites and parts with read-only tools, computes inventory cover and drafts a briefing with options for buyers.

## Why AI, and why this kind

**Why AI.** Watch news, weather, port and supplier signals for events that threaten critical inputs, link them to affected parts and orders, and brief the buyers with options. The evidence that separates good from bad outcomes (Event location match, Part criticality, Inventory cover) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "unverified social posts" are what teams reach for first, and they fail because rumours trigger unnecessary actions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An agent that ingests events, resolves them to supplier sites and parts with read-only tools, computes inventory cover and drafts a briefing with options for buyers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Event location match, Part criticality, Inventory cover and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A keyword alert on supplier names and regions, because purchasing already uses it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An agent that ingests events, resolves them to supplier sites and parts with read-only tools, computes inventory cover and drafts a briefing with options for buyers | chosen | Meets the 2500 ms envelope at $5.28 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lead time before disruption impact) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Alerting on headlines.
- Evaluation trap: Letting the agent place orders.
- Duplicate reports: many sources report the same event.
- Unclear location: the place name is ambiguous.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
