# Category & Browse Page Ranking: use-case brief

> Generated from the blueprint `retail/category-page-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Category & Browse Page Ranking · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Order products on category and browse pages to maximise conversion, balancing popularity, personalisation, margin and new-item exposure. The system has to run in under 100 milliseconds, inside these limits: Merchandising pins and bans, 40 ms and Fair exposure to new sellers.

**Why it is hard.** The obvious approach is raw CTR, and it fails because top slots always win clicks. The second trap is in "Stability": the real signal is consistent ordering between pages and sessions, while teams usually reach for fully real-time reordering.

**Scale and stakes.** At 10 million users this is about 24.0M model-touching events a day, 278 requests per second on average and 1.7K at peak, at an estimated $13.4K a month. A mistake is expensive in the way revenue per visit measures it.

**What success looks like.** Offline: Debiased NDCG and Interleaving sensitivity. Online: Category conversion rate and Revenue per visit. The launch is judged on "Category conversion rate" while "Revenue per visit" must not get worse.

## Objective, loss and constraints

**Business objective.** Order products on category and browse pages to maximise conversion, balancing popularity, personalisation, margin and new-item exposure.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{ListwisePenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ListwisePenalty} | Penalty on the quality of the whole ordered list, for example diversity or position-weighted relevance. |

**Hard constraints**

- Merchandising pins and bans
- 40 ms
- Fair exposure to new sellers
- Stable ordering (no flicker)

## The approach in one paragraph

Start with best-seller sort with merchandiser pins. Then earn the move to two-stage LTR with propensity weighting, margin-aware re-rank, exploration slots and a stability regulariser, and only if it beats the baseline on Debiased NDCG and Interleaving sensitivity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Debiased CTR | Position-adjusted click-through rate. Quality. Guard against: propensity from randomisation. |
| Add Margin and stock depth | Contribution margin and stock. Business constraint. Guard against: as-of stock. |
| Add Newness exploration bonus | UCB bonus for low-exposure items. Cold items. Guard against: budget limit. |
| Run it as one pipeline | Page request (API), Category candidate fetch (index), Feature lookup (feature store), LTR ranker (LambdaMART), Business re-rank (pins and margin), Exploration allocator (bandit) and Impression logs (Kafka). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle merchandiser pin overrides model on bad item | Pin expiry and guardrail alerts. |

**Deliberately not doing**

- Item ID: arbitrary.
- Total page views: popularity loop.

**How the approach is proven**

Prove it offline on Debiased NDCG and Interleaving sensitivity using time-ordered splits, then online on "Category conversion rate" with "Revenue per visit" as the guardrail. Watch for: Position bias unaddressed and Offline metric favours incumbent ranker.

## Baseline and production design

- **Baseline (build this first):** Best-seller sort with merchandiser pins.
- **Production design:** Two-stage LTR with propensity weighting, margin-aware re-rank, exploration slots and a stability regulariser.

## Why AI, and why this kind

**Why AI.** Order products on category and browse pages to maximise conversion, balancing popularity, personalisation, margin and new-item exposure. The evidence that separates good from bad outcomes (Debiased CTR, Margin and stock depth, Newness exploration bonus) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw CTR" are what teams reach for first, and they fail because top slots always win clicks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Two-stage LTR with propensity weighting, margin-aware re-rank, exploration slots and a stability regulariser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Debiased CTR, Margin and stock depth, Newness exploration bonus and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Best-seller sort with merchandiser pins | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-stage LTR with propensity weighting, margin-aware re-rank, exploration slots and a stability regulariser | chosen | Meets the 80 ms envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Category conversion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Position bias unaddressed.
- Evaluation trap: Offline metric favours incumbent ranker.
- Merchandiser pin overrides model on bad item: poor experience.
- Stock-out in top ranks: top-ranked items are unavailable so shoppers hit dead-ends and bounce.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
