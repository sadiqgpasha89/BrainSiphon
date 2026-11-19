# Homepage Feed Recommendations: use-case brief

> Generated from the blueprint `retail/homepage-feed-recommendations` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Homepage Feed Recommendations · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Fill a personalised homepage feed that maximises long-term engagement and purchases for 10M users while managing diversity and freshness. The system has to run in under 100 milliseconds, inside these limits: 60 ms feed assembly, Frequency capping per item and Diversity constraints.

**Why it is hard.** The obvious approach is single collaborative filtering model, and it fails because one model has blind spots for new items and cold users. The second trap is in "Objective": the real signal is multi-task heads for click, add-to-cart and purchase with calibrated blend, while teams usually reach for optimising clicks only.

**Scale and stakes.** At 10 million users this is about 45.0M model-touching events a day, 521 requests per second on average and 3.1K at peak, at an estimated $18.6K a month. A mistake is expensive in the way 7-day return rate measures it.

**What success looks like.** Offline: NDCG and calibration of purchase head and Coverage of catalogue. Online: Purchases per user session and 7-day return rate. The launch is judged on "Purchases per user session" while "7-day return rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Fill a personalised homepage feed that maximises long-term engagement and purchases for 10M users while managing diversity and freshness.

**Training objective.** `\mathcal{L}=-\sum_{(u,i)}\log\frac{e^{s(u,i)/\tau}}{\sum_{j\in\mathcal N_u}e^{s(u,j)/\tau}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(u,i)} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| e^{s(u,i)/\tau} | Euler's number (about 2.718), the base of the exponential function. |

**Hard constraints**

- 60 ms feed assembly
- Frequency capping per item
- Diversity constraints
- Explore/exploit slots

## The approach in one paragraph

Start with popularity within user segment plus recently viewed. Then earn the move to two-tower retrieval with ANN, multi-task DCN-v2 ranker, MMR diversity re-ranking and epsilon-greedy exploration slots, and only if it beats the baseline on NDCG and calibration of purchase head and Coverage of catalogue after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around User embedding recency | Exponentially decayed mean of recent item embeddings. Interest drift. Guard against: decay constants tuned on pre-period. |
| Add Item freshness and velocity | Age and rolling interaction velocity. Newness. Guard against: exclude interactions after impression time. |
| Add Cross features user-category | Affinity times category popularity. Personalisation. Guard against: compute from lagged aggregates. |
| Run it as one pipeline | Feed request (API gateway), User state fetch (feature store), Candidate generation (two-tower plus ANN), Multi-task ranker (DCN-v2 on GPU), Diversity and policy re-rank (MMR) and Impression logger (Kafka), with Feedback aggregation off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new user with no history | Contextual bandit onboarding with category quiz priors. |

**Deliberately not doing**

- Total lifetime clicks: popularity bias.
- Device model: weak and unstable.

**How the approach is proven**

Prove it offline on NDCG and calibration of purchase head and Coverage of catalogue using time-ordered splits, then online on "Purchases per user session" with "7-day return rate" as the guardrail. Watch for: Training on logged policy without propensities and Offline hits vs online diversity effects.

## Baseline and production design

- **Baseline (build this first):** Popularity within user segment plus recently viewed.
- **Production design:** Two-tower retrieval with ANN, multi-task DCN-v2 ranker, MMR diversity re-ranking and epsilon-greedy exploration slots.

## Why AI, and why this kind

**Why AI.** Fill a personalised homepage feed that maximises long-term engagement and purchases for 10M users while managing diversity and freshness. The evidence that separates good from bad outcomes (User embedding recency, Item freshness and velocity, Cross features user-category) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single collaborative filtering model" are what teams reach for first, and they fail because one model has blind spots for new items and cold users. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Two-tower retrieval with ANN, multi-task DCN-v2 ranker, MMR diversity re-ranking and epsilon-greedy exploration slots.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among User embedding recency, Item freshness and velocity, Cross features user-category and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Popularity within user segment plus recently viewed | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-tower retrieval with ANN, multi-task DCN-v2 ranker, MMR diversity re-ranking and epsilon-greedy exploration slots | chosen | Meets the 80 ms envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Purchases per user session) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on logged policy without propensities.
- Evaluation trap: Offline hits vs online diversity effects.
- New user with no history: feed is generic.
- Sale event surges trending items: all feeds look identical.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
