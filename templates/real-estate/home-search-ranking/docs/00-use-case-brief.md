# Home Search Ranking: use-case brief

> Generated from the blueprint `real-estate/home-search-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Home Search Ranking · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness. The system has to run in under 100 milliseconds, inside these limits: Under 80 ms at the 99th percentile including retrieval and re-rank, Every filter the buyer sets is respected exactly and never traded for relevance and No steering by protected attributes or their proxies in features or exposure.

**Why it is hard.** The obvious approach is clicks alone, and it fails because clicks reward photo quality and not fit, so a model of clicks learns to show pretty homes that do not match. The second trap is in "Fit": the real signal is a hard match on price, bedrooms and location before any scoring, while teams usually reach for a soft score that trades fit against engagement.

**Scale and stakes.** At 10 million users this is about 45.0M model-touching events a day, 521 requests per second on average and 3.1K at peak, at an estimated $19.2K a month. A mistake is expensive in the way time to first enquiry measures it.

**What success looks like.** Offline: NDCG@10 and Calibration of CTR. Online: Saves and enquiries per session and Time to first enquiry. The launch is judged on "Saves and enquiries per session" while "Time to first enquiry" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness.

**Training objective.** `\mathcal{L}=\mathrm{ListNet}(s,y)+\lambda\,\mathrm{BPR}(\hat{y},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{ListNet} | ListNet loss: trains a model to reproduce the whole ranked list by matching probability distributions over rankings. |
| s | The ranking score the model gives each listing in the result list. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BPR} | Bayesian personalised ranking loss: trains the model to score items a user chose above items they did not. |
| \hat{y} | The model's prediction of y. |

**Hard constraints**

- Under 80 ms at the 99th percentile including retrieval and re-rank
- Every filter the buyer sets is respected exactly and never traded for relevance
- No steering by protected attributes or their proxies in features or exposure
- New listings appear in results within one minute

## The approach in one paragraph

Start with sort by newest with filters, because portals start this way. Then earn the move to two-stage retrieval and learning-to-rank on session context with exposure constraints and a freshness boost, and only if it beats the baseline on NDCG@10 and Calibration of CTR after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Price fit | Position of the price within the buyer's stated range, scaled from 0 to 1. The main relevance factor for most buyers. Guard against: the range changes during a search, so use the current one. |
| Add Saved and shared | Saves and shares of this listing by buyers with similar filters in the last 7 days. A strong interest signal. Guard against: sparse for new listings, so smooth with a prior. |
| Add Listing freshness | Hours since the listing went live, passed through a decay function. New homes sell quickly and buyers want them first. Guard against: decay too steeply and a good older home disappears. |
| Run it as one pipeline | Query and filters (search API), Candidate retrieval (geo and filter index), Feature service (Redis), Ranker (gradient boosting ranker), Fairness re-rank (constraint rules), Results (API) and Click log (Kafka). |
| Optimise the right thing | The objective weighs listNet loss: trains a model to reproduce the whole ranked list by matching probability distributions over rankings, so the model is trained on the cost of the decision and not on a generic score. |
| Handle cold start buyer | Fall back to popularity within the buyer's filters and refine after the first few actions. |

**Deliberately not doing**

- Photo count: Reflects portal and agent habits and not suitability for the buyer.
- Listing agent: Has no bearing on what the buyer wants and invites bias in exposure.
- Time on page alone: Confounded by distraction and device, and a long visit can mean confusion.

**How the approach is proven**

Prove it offline on NDCG@10 and Calibration of CTR using time-ordered splits, then online on "Saves and enquiries per session" with "Time to first enquiry" as the guardrail. Watch for: Position bias in click logs means top results look better than they are and Offline replay cannot reproduce how buyers would respond to a different ranking.

## Baseline and production design

- **Baseline (build this first):** Sort by newest with filters, because portals start this way.
- **Production design:** Two-stage retrieval and learning-to-rank on session context with exposure constraints and a freshness boost.

## Why AI, and why this kind

**Why AI.** Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness. The evidence that separates good from bad outcomes (Price fit, Saved and shared, Listing freshness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "clicks alone" are what teams reach for first, and they fail because clicks reward photo quality and not fit, so a model of clicks learns to show pretty homes that do not match. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Two-stage retrieval and learning-to-rank on session context with exposure constraints and a freshness boost.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Price fit, Saved and shared, Listing freshness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Sort by newest with filters, because portals start this way | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-stage retrieval and learning-to-rank on session context with exposure constraints and a freshness boost | chosen | Meets the 80 ms envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Saves and enquiries per session) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Position bias in click logs means top results look better than they are.
- Evaluation trap: Offline replay cannot reproduce how buyers would respond to a different ranking.
- Cold start buyer: a new buyer has no history so ranking has little to personalise on.
- Hot listing: a listing appears at the top for everyone and crowds out others.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
