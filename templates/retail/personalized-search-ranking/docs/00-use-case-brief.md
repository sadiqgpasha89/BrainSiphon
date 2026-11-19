# Personalised Product Search Ranking: use-case brief

> Generated from the blueprint `retail/personalized-search-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Personalised Product Search Ranking · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers. The system has to run in under 100 milliseconds, inside these limits: p99 under 80 ms including retrieval, 100M-item catalogue and Position-bias-aware training.

**Why it is hard.** The obvious approach is raw click logs, and it fails because top positions get clicks regardless of relevance. The second trap is in "Objective": the real signal is purchase-weighted graded relevance (view, cart, buy), while teams usually reach for click-through rate alone.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $14.5K a month. A mistake is expensive in the way revenue per search measures it.

**What success looks like.** Offline: NDCG@10 with propensity weighting and Recall@200 of retrieval. Online: Search conversion rate and Revenue per search. The launch is judged on "Search conversion rate" while "Revenue per search" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers.

**Training objective.** `\mathcal{L}=\sum_{q}\sum_{(i,j):y_i>y_j}\log\left(1+e^{-(s_i-s_j)}\right)\left|\Delta\mathrm{NDCG}_{ij}\right|`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{q} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| e^{-(s_i-s_j)} | Euler's number (about 2.718), the base of the exponential function. |
| \Delta | A change or difference in the quantity that follows. |
| \mathrm{NDCG}_{ij} | Normalised discounted cumulative gain: a ranking quality score that rewards relevant items near the top of the list. |

**Hard constraints**

- p99 under 80 ms including retrieval
- 100M-item catalogue
- Position-bias-aware training
- Query-level explainability for merchandisers
- Serviceability by pincode or dark store applied before ranking
- Sellers keep a guaranteed exposure floor

## The approach in one paragraph

Start with bM25 with business-rule boosts. Then earn the move to two-stage: ANN plus BM25 hybrid retrieval, then a LambdaMART/transformer ranker with propensity correction, served with embedding and feature caches. Final score is w1 times P(click) plus w2 times P(cart given click) plus w3 times P(purchase given cart) times log(1+GMV) plus a seller exposure boost, with a position tower used in training only and Roaring-bitmap availability masks applied inside the retrieval shard, and only if it beats the baseline on NDCG@10 with propensity weighting and Recall@200 of retrieval after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Query-item semantic score | Cosine of query and item embeddings from a dual encoder. Relevance backbone. Guard against: embeddings must be trained on pre-period logs. |
| Add Item price-rank within query | Percentile of price among retrieved results. Price sensitivity cue. Guard against: compute over the retrieved set not the catalogue. |
| Add User-category affinity | Decayed purchase and click share by category. Personalisation. Guard against: exclude events in the current session after the query. |
| Run it as one pipeline | Query service (gateway), Query understanding (spell and intent model), Hybrid retrieval (ANN plus BM25), Feature fetch (Redis and item store), Ranker (LambdaMART on CPU), Business re-rank (merchandising rules) and Click logger (Kafka). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new seller floods catalogue with keyword-stuffed items | Quality score features and seller-trust priors. |

**Deliberately not doing**

- Raw impressions count: rich-get-richer feedback loop.
- Item title length: spurious correlation with conversions.

**How the approach is proven**

Prove it offline on NDCG@10 with propensity weighting and Recall@200 of retrieval using time-ordered splits, then online on "Search conversion rate" with "Revenue per search" as the guardrail. Watch for: Training on clicks from the current ranker and Evaluating only on head queries.

## Baseline and production design

- **Baseline (build this first):** BM25 with business-rule boosts.
- **Production design:** Two-stage: ANN plus BM25 hybrid retrieval, then a LambdaMART/transformer ranker with propensity correction, served with embedding and feature caches. Final score is w1 times P(click) plus w2 times P(cart given click) plus w3 times P(purchase given cart) times log(1+GMV) plus a seller exposure boost, with a position tower used in training only and Roaring-bitmap availability masks applied inside the retrieval shard.

## Why AI, and why this kind

**Why AI.** Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers. The evidence that separates good from bad outcomes (Query-item semantic score, Item price-rank within query, User-category affinity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw click logs" are what teams reach for first, and they fail because top positions get clicks regardless of relevance. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Two-stage: ANN plus BM25 hybrid retrieval, then a LambdaMART/transformer ranker with propensity correction, served with embedding and feature caches. Final score is w1 times P(click) plus w2 times P(cart given click) plus w3 times P(purchase given cart) times log(1+GMV) plus a seller exposure boost, with a position tower used in training only and Roaring-bitmap availability masks applied inside the retrieval shard.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Query-item semantic score, Item price-rank within query, User-category affinity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: BM25 with business-rule boosts | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-stage: ANN plus BM25 hybrid retrieval, then a LambdaMART/transformer ranker with propensity correction, served with embedding and feature caches. Final score is w1 times P(click) plus w2 times P(cart given click) plus w3 times P(purchase given cart) times log(1+GMV) plus a seller exposure boost, with a position tower used in training only and Roaring-bitmap availability masks applied inside the retrieval shard | chosen | Meets the 80 ms envelope at $0.016 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Search conversion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on clicks from the current ranker.
- Evaluation trap: Evaluating only on head queries.
- New seller floods catalogue with keyword-stuffed items: rankings polluted.
- Embedding model update changes neighbour sets: sudden relevance shifts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
