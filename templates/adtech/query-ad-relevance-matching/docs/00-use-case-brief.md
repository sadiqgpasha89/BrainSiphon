# Query–Ad Relevance Matching: use-case brief

> Generated from the blueprint `adtech/query-ad-relevance-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Query–Ad Relevance Matching · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score semantic relevance between queries and ads to gate eligibility and improve quality scores. The system has to run in under 100 milliseconds, inside these limits: 10 ms scoring with cached ad embeddings, Multi-language and Click-labelled bias.

**Why it is hard.** The obvious approach is clicks only, and it fails because clicks reflect position and creative appeal. The second trap is in "Serving": the real signal is dual-encoder retrieval and cross-encoder rerank of top few, while teams usually reach for cross-encoder for all.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $13.0K a month. A mistake is expensive in the way cTR at constant revenue measures it.

**What success looks like.** Offline: AUC against human judgments and NDCG of relevance-ranked ads. Online: Ad quality complaints and CTR at constant revenue. The launch is judged on "Ad quality complaints" while "CTR at constant revenue" must not get worse.

## Objective, loss and constraints

**Business objective.** Score semantic relevance between queries and ads to gate eligibility and improve quality scores.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,\sigma(f(q,a)))+\lambda\,\mathrm{Distillation}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \sigma | Sigmoid function: squashes the score into a probability between 0 and 1. |
| f | The matching model: its score for a query and ad pair, passed through the sigmoid to give a probability. |
| q | The search query. |
| a | The ad being matched to the query. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Distillation} | Penalty for disagreeing with a larger teacher model, so the small fast model copies the teacher's behaviour. |

**Hard constraints**

- 10 ms scoring with cached ad embeddings
- Multi-language
- Click-labelled bias
- Explainable to advertisers

## The approach in one paragraph

Start with keyword match with match-type rules. Then earn the move to distilled cross-encoder with dual-encoder candidate retrieval, calibrated relevance used as an eligibility gate, and only if it beats the baseline on AUC against human judgments and NDCG of relevance-ranked ads after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Dual-encoder similarity | Query and ad embedding cosine. Fast match. Guard against: ad embedding refresh. |
| Add Cross-encoder score | Joint transformer relevance. Precision. Guard against: distillation. |
| Add Keyword match type | Exact, phrase, broad. Intent. Guard against: rules. |
| Run it as one pipeline | Search query (gateway), Ad candidate retrieval (ANN), Dual-encoder scorer (distilled), Cross-encoder reranker (small transformer), Relevance gate (thresholds) and Auction (ranker), with Judgement feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle brand queries for competitors | Competitor-brand rules in gate. |

**Deliberately not doing**

- Ad ID: none.
- Bid amount: leaks auction.

**How the approach is proven**

Prove it offline on AUC against human judgments and NDCG of relevance-ranked ads using time-ordered splits, then online on "Ad quality complaints" with "CTR at constant revenue" as the guardrail. Watch for: Training on clicks biased by position and Test queries easier than live.

## Baseline and production design

- **Baseline (build this first):** Keyword match with match-type rules.
- **Production design:** Distilled cross-encoder with dual-encoder candidate retrieval, calibrated relevance used as an eligibility gate.

## Why AI, and why this kind

**Why AI.** Score semantic relevance between queries and ads to gate eligibility and improve quality scores. The evidence that separates good from bad outcomes (Dual-encoder similarity, Cross-encoder score, Keyword match type) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "clicks only" are what teams reach for first, and they fail because clicks reflect position and creative appeal. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Distilled cross-encoder with dual-encoder candidate retrieval, calibrated relevance used as an eligibility gate.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Dual-encoder similarity, Cross-encoder score, Keyword match type and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword match with match-type rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Distilled cross-encoder with dual-encoder candidate retrieval, calibrated relevance used as an eligibility gate | chosen | Meets the 80 ms envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Ad quality complaints) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on clicks biased by position.
- Evaluation trap: Test queries easier than live.
- Brand queries for competitors: ads shown against policy.
- Multilingual queries with code-mixing: relevance poorly estimated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
