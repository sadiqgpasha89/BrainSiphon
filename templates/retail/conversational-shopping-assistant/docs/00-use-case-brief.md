# Conversational Shopping Assistant: use-case brief

> Generated from the blueprint `retail/conversational-shopping-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Conversational Shopping Assistant · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Let shoppers describe needs in natural language and get grounded, buyable product recommendations with comparisons and follow-ups. The system has to run interactively, within a few seconds, inside these limits: Never recommend unavailable or non-existent products, p95 under 5 s first answer and Brand safety.

**Why it is hard.** The obvious approach is model knowledge of products, and it fails because models invent products and specifications. The second trap is in "Tools": the real signal is search, compare and cart tools with typed schemas, while teams usually reach for free-text answers only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $554.0K a month. A mistake is expensive in the way cost per assisted session measures it.

**What success looks like.** Offline: Grounding precision and Constraint satisfaction rate on golden queries. Online: Assisted conversion rate and Cost per assisted session. The launch is judged on "Assisted conversion rate" while "Cost per assisted session" must not get worse.

## Objective, loss and constraints

**Business objective.** Let shoppers describe needs in natural language and get grounded, buyable product recommendations with comparisons and follow-ups.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x,\text{catalogue})+\lambda\,\mathrm{OutOfCatalogue}`

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
| \text{catalogue} | The product catalogue the assistant may recommend from. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{OutOfCatalogue} | Penalty for recommending products that are not in the catalogue. |

**Hard constraints**

- Never recommend unavailable or non-existent products
- p95 under 5 s first answer
- Brand safety
- Cost per session cap

## The approach in one paragraph

Start with intent classifier plus filtered search with canned replies. Then earn the move to tool-using LLM with query planning, hybrid search, attribute-aware comparison and a verifier; semantic cache for frequent intents, and only if it beats the baseline on Grounding precision and Constraint satisfaction rate on golden queries after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Catalogue grounding rate | Fraction of mentioned products found in catalogue. Hallucination detector. Guard against: exact ID verification. |
| Add Attribute constraint satisfaction | Do recommended items meet stated constraints. Relevance. Guard against: parse constraints deterministically. |
| Add Session conversion and assist rate | Purchase after assistant use. Business value. Guard against: holdout design. |
| Run it as one pipeline | Chat gateway (websocket), Query planner (LLM small model), Catalogue search tool (hybrid retrieval), Comparison and stock tools (typed APIs), Response generator (LLM), Grounding verifier (ID check) and Transcript logger (eval pipeline). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle prompt injection via product reviews | Review content isolated and sanitised as data. |

**Deliberately not doing**

- Chat length: not quality.
- Response friendliness score: bias to verbosity.

**How the approach is proven**

Prove it offline on Grounding precision and Constraint satisfaction rate on golden queries using time-ordered splits, then online on "Assisted conversion rate" with "Cost per assisted session" as the guardrail. Watch for: Golden queries written by developers and Judging with an LLM that shares the model's biases.

## Baseline and production design

- **Baseline (build this first):** Intent classifier plus filtered search with canned replies.
- **Production design:** Tool-using LLM with query planning, hybrid search, attribute-aware comparison and a verifier; semantic cache for frequent intents.

## Why AI, and why this kind

**Why AI.** Let shoppers describe needs in natural language and get grounded, buyable product recommendations with comparisons and follow-ups. The evidence that separates good from bad outcomes (Catalogue grounding rate, Attribute constraint satisfaction, Session conversion and assist rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model knowledge of products" are what teams reach for first, and they fail because models invent products and specifications. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Tool-using LLM with query planning, hybrid search, attribute-aware comparison and a verifier; semantic cache for frequent intents.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Catalogue grounding rate, Attribute constraint satisfaction, Session conversion and assist rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Intent classifier plus filtered search with canned replies | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Tool-using LLM with query planning, hybrid search, attribute-aware comparison and a verifier; semantic cache for frequent intents | chosen | Meets the 2500 ms envelope at $6.16 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Assisted conversion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Golden queries written by developers.
- Evaluation trap: Judging with an LLM that shares the model's biases.
- Prompt injection via product reviews: model repeats attacker text.
- Price changes mid-conversation: quoted price is stale.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
