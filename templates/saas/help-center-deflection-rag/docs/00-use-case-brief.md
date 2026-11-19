# Help-Centre Deflection with RAG: use-case brief

> Generated from the blueprint `saas/help-center-deflection-rag` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Help-Centre Deflection with RAG · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Resolve customer questions in self-service with a grounded assistant, deflecting tickets while keeping satisfaction and escalation safe. The system has to run interactively, within a few seconds, inside these limits: Deflection without satisfaction loss, Docs versioned per product release and Escalation with context.

**Why it is hard.** The obvious approach is deflection count, and it fails because frustrated users abandon rather than succeed. The second trap is in "Content": the real signal is fix docs gaps found by failed queries, while teams usually reach for only tune the model.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $200.5K a month. A mistake is expensive in the way ticket volume per active user measures it.

**What success looks like.** Offline: Groundedness and answer correctness and Retrieval recall. Online: Verified resolution rate and Ticket volume per active user. The launch is judged on "Verified resolution rate" while "Ticket volume per active user" must not get worse.

## Objective, loss and constraints

**Business objective.** Resolve customer questions in self-service with a grounded assistant, deflecting tickets while keeping satisfaction and escalation safe.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{docs})+\lambda\,\mathrm{Hallucination}`

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
| \text{docs} | The help-centre articles retrieved for the question. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Hallucination} | Penalty for statements not supported by the retrieved articles. |

**Hard constraints**

- Deflection without satisfaction loss
- Docs versioned per product release
- Escalation with context
- Cost per conversation

## The approach in one paragraph

Start with keyword help-centre search. Then earn the move to hybrid retrieval, grounded answering with abstention, confirmed-resolution tracking and content-gap analytics, and only if it beats the baseline on Groundedness and answer correctness and Retrieval recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Answer groundedness | Claims supported by docs. Safety. Guard against: nLI. |
| Add Recontact rate within 7 days | Same user opens a ticket. True resolution. Guard against: windows. |
| Add Query-coverage gap | Queries with no good doc. Content gap. Guard against: retrieval confidence. |
| Run it as one pipeline | User question (widget), Retriever (hybrid), Reranker (cross-encoder), Answer LLM (grounded), Groundedness check (verifier) and Gap analytics (content team), with Escalation handoff off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle docs for a new feature are not yet published | Abstain when retrieval confidence is low. |

**Deliberately not doing**

- Chat turns: not success.
- Thumbs-up rate alone: biased.

**How the approach is proven**

Prove it offline on Groundedness and answer correctness and Retrieval recall using time-ordered splits, then online on "Verified resolution rate" with "Ticket volume per active user" as the guardrail. Watch for: Counting abandonment as deflection and Test questions from docs titles.

## Baseline and production design

- **Baseline (build this first):** Keyword help-centre search.
- **Production design:** Hybrid retrieval, grounded answering with abstention, confirmed-resolution tracking and content-gap analytics.

## Why AI, and why this kind

**Why AI.** Resolve customer questions in self-service with a grounded assistant, deflecting tickets while keeping satisfaction and escalation safe. The evidence that separates good from bad outcomes (Answer groundedness, Recontact rate within 7 days, Query-coverage gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "deflection count" are what teams reach for first, and they fail because frustrated users abandon rather than succeed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Hybrid retrieval, grounded answering with abstention, confirmed-resolution tracking and content-gap analytics.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Answer groundedness, Recontact rate within 7 days, Query-coverage gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword help-centre search | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hybrid retrieval, grounded answering with abstention, confirmed-resolution tracking and content-gap analytics | chosen | Meets the 2500 ms envelope at $2.23 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Verified resolution rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting abandonment as deflection.
- Evaluation trap: Test questions from docs titles.
- Docs for a new feature are not yet published: assistant guesses.
- Users ask account-specific questions: generic answer misleads.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
