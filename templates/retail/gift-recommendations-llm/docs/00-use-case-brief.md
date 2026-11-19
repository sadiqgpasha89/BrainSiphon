# Gift Recommendation Assistant: use-case brief

> Generated from the blueprint `retail/gift-recommendations-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Gift Recommendation Assistant · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions. The system has to run interactively, within a few seconds, inside these limits: Budget and delivery date constraints, Age-appropriate content and No fabricated items.

**Why it is hard.** The obvious approach is free text only, and it fails because missing budget or date makes results useless. The second trap is in "Delivery": the real signal is delivery-date feasibility in ranking, while teams usually reach for relevance only.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.7K a month. A mistake is expensive in the way delivery-on-time rate measures it.

**What success looks like.** Offline: Slot-filling accuracy and Constraint satisfaction rate. Online: Gift conversion rate and Delivery-on-time rate. The launch is judged on "Gift conversion rate" while "Delivery-on-time rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{GroundingMiss}`

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
| x | The shopper's request and context. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GroundingMiss} | Penalty when the recommended gift is not grounded in the real catalogue and the stated preferences. |

**Hard constraints**

- Budget and delivery date constraints
- Age-appropriate content
- No fabricated items
- Seasonal traffic spikes

## The approach in one paragraph

Start with curated gift guides by price. Then earn the move to slot-filling dialogue manager with LLM and catalogue retrieval, delivery feasibility filter and diversified suggestions, and only if it beats the baseline on Slot-filling accuracy and Constraint satisfaction rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Gift-brief completeness | Filled slots out of required. Dialogue state. Guard against: slot extractor accuracy. |
| Add Deadline feasibility | Whether delivery date meets occasion date. Hard filter. Guard against: live carrier promises. |
| Add Recipient interest match | Interest embedding vs item embedding. Relevance. Guard against: self-reported interests. |
| Run it as one pipeline | Chat interface (web and app), Slot extractor (LLM structured output), Candidate retrieval (hybrid search), Feasibility filter (delivery and budget rules), Suggestion composer (LLM), Grounding check (ID verification) and Conversion tracking (analytics). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle seasonal peak (festival) | Pre-computed gift sets and cache for common briefs. |

**Deliberately not doing**

- Chat tone: stylistic only.
- Sender browsing history: not the recipient.

**How the approach is proven**

Prove it offline on Slot-filling accuracy and Constraint satisfaction rate using time-ordered splits, then online on "Gift conversion rate" with "Delivery-on-time rate" as the guardrail. Watch for: Evaluating on easy briefs and Missing deadline constraints in test.

## Baseline and production design

- **Baseline (build this first):** Curated gift guides by price.
- **Production design:** Slot-filling dialogue manager with LLM and catalogue retrieval, delivery feasibility filter and diversified suggestions.

## Why AI, and why this kind

**Why AI.** Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions. The evidence that separates good from bad outcomes (Gift-brief completeness, Deadline feasibility, Recipient interest match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free text only" are what teams reach for first, and they fail because missing budget or date makes results useless. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Slot-filling dialogue manager with LLM and catalogue retrieval, delivery feasibility filter and diversified suggestions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Gift-brief completeness, Deadline feasibility, Recipient interest match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Curated gift guides by price | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Slot-filling dialogue manager with LLM and catalogue retrieval, delivery feasibility filter and diversified suggestions | chosen | Meets the 2500 ms envelope at $5.08 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Gift conversion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on easy briefs.
- Evaluation trap: Missing deadline constraints in test.
- Seasonal peak (festival): traffic rises ten-fold and LLM cost and latency blow past budget.
- Sensitive occasions (bereavement): tone-deaf suggestions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
