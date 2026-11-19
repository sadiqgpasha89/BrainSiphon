# Comparable Sales Selection: use-case brief

> Generated from the blueprint `real-estate/comparable-sales-selection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Comparable Sales Selection · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Select and rank the most similar recent sales for a subject property and adjust them, so valuations and appraisals are defensible. The system has to run in under 100 milliseconds, inside these limits: Comparable set explainable to an appraiser, Only closed sales before the valuation date and Response under 100 ms.

**Why it is hard.** The obvious approach is distance and size only, and it fails because a near neighbour with a different school zone is a poor comparable. The second trap is in "Recency": the real signal is sales recency with time adjustment, while teams usually reach for last 12 months equally.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.2K a month. A mistake is expensive in the way revisions requested measures it.

**What success looks like.** Offline: Agreement with appraiser-chosen comps and Valuation error from selected comps. Online: Appraiser time per report and Revisions requested. The launch is judged on "Appraiser time per report" while "Revisions requested" must not get worse.

## Objective, loss and constraints

**Business objective.** Select and rank the most similar recent sales for a subject property and adjust them, so valuations and appraisals are defensible.

**Training objective.** `\mathcal{L}=\mathrm{Triplet}(a,p,n)+\lambda\,\mathrm{Huber}(\hat{y}-y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Triplet} | Triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin. |
| a | The anchor: the subject property's embedding. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| n | A negative: the embedding of a property that is not a good comparable. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- Comparable set explainable to an appraiser
- Only closed sales before the valuation date
- Response under 100 ms
- Adjustments bounded by policy

## The approach in one paragraph

Start with the five nearest recent sales by distance and size, because appraisers do this by hand. Then earn the move to metric-learned embeddings with approximate nearest neighbour retrieval, then a learned adjustment model and a reranker, and only if it beats the baseline on Agreement with appraiser-chosen comps and Valuation error from selected comps after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Learned property embedding | Vector from attributes and photos. Similarity. Guard against: training data bias. |
| Add Sale recency weight | Days since sale. Time. Guard against: market speed. |
| Add Same school or tract flag | Within the same boundary. Locality. Guard against: boundary changes. |
| Run it as one pipeline | Subject property features (property service), Candidate retrieval (ANN index of closed sales), Reranker (gradient boosting), Adjustment model (regression) and Rule check (policy engine), with Comparable report and Feedback capture off the critical path. |
| Optimise the right thing | The objective weighs triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin, so the model is trained on the cost of the decision and not on a generic score. |
| Handle few comparables | Widen the search criteria in steps and flag the lower confidence to the appraiser. |

**Deliberately not doing**

- Seller name: irrelevant.
- Listing agent: irrelevant.
- Photo order: arbitrary.

**How the approach is proven**

Prove it offline on Agreement with appraiser-chosen comps and Valuation error from selected comps using time-ordered splits, then online on "Appraiser time per report" with "Revisions requested" as the guardrail. Watch for: Appraiser comps are biased toward familiar sales and Future sales leak.

## Baseline and production design

- **Baseline (build this first):** The five nearest recent sales by distance and size, because appraisers do this by hand.
- **Production design:** Metric-learned embeddings with approximate nearest neighbour retrieval, then a learned adjustment model and a reranker.

## Why AI, and why this kind

**Why AI.** Select and rank the most similar recent sales for a subject property and adjust them, so valuations and appraisals are defensible. The evidence that separates good from bad outcomes (Learned property embedding, Sale recency weight, Same school or tract flag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "distance and size only" are what teams reach for first, and they fail because A near neighbour with a different school zone is a poor comparable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Metric-learned embeddings with approximate nearest neighbour retrieval, then a learned adjustment model and a reranker.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Learned property embedding, Sale recency weight, Same school or tract flag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The five nearest recent sales by distance and size, because appraisers do this by hand | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Metric-learned embeddings with approximate nearest neighbour retrieval, then a learned adjustment model and a reranker | chosen | Meets the 80 ms envelope at $2.72 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Appraiser time per report) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Appraiser comps are biased toward familiar sales.
- Evaluation trap: Future sales leak.
- Few comparables: rural properties have few comparables within any sensible radius.
- Non-arm's-length sale: a family transfer or distressed deal is not a market price.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
