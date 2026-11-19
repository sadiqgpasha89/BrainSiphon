# Buy-Box & Seller Offer Ranking: use-case brief

> Generated from the blueprint `retail/buy-box-seller-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Buy-Box & Seller Offer Ranking · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Select which seller wins the featured offer for each product based on price, speed, reliability and customer-experience. The system has to run in under 100 milliseconds, inside these limits: Transparent seller policy, Anti-gaming and 30 ms.

**Why it is hard.** The obvious approach is lowest price wins, and it fails because cheapest sellers with poor fulfilment cause returns. The second trap is in "Gaming": the real signal is robust features resistant to manipulation, while teams usually reach for raw seller-reported speed.

**Scale and stakes.** At 10 million users this is about 12.0M model-touching events a day, 139 requests per second on average and 833 at peak, at an estimated $12.5K a month. A mistake is expensive in the way seller diversity measures it.

**What success looks like.** Offline: Predicted vs realised conversion and Customer-value regret. Online: Defect rate of buy-box orders and Seller diversity. The launch is judged on "Defect rate of buy-box orders" while "Seller diversity" must not get worse.

## Objective, loss and constraints

**Business objective.** Select which seller wins the featured offer for each product based on price, speed, reliability and customer-experience.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{conversion},p)+\lambda\,\mathrm{FairnessPenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{conversion} | The label: 1 if the shopper bought from the offer. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{FairnessPenalty} | Penalty for unfairly favouring some sellers when offers are otherwise similar. |

**Hard constraints**

- Transparent seller policy
- Anti-gaming
- 30 ms
- Regulatory fairness

## The approach in one paragraph

Start with rule-based lowest landed price with minimum performance. Then earn the move to conversion-and-experience model producing expected customer value per offer, with seller-health gating and exploration for new sellers, and only if it beats the baseline on Predicted vs realised conversion and Customer-value regret after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Landed price percentile | Price plus shipping percentile. Value. Guard against: include taxes. |
| Add Seller defect rate | Order defect rate over 60 days. Quality. Guard against: matured outcomes. |
| Add Delivery promise reliability | Actual vs promised ratio. Trust. Guard against: seller-level shrinkage. |
| Run it as one pipeline | Product page request (API), Offer fetch (offer store), Seller metrics lookup (feature store), Offer value model (GBDT), Fairness and policy gate (rules), Winner selection (ranker) and Outcome logs (stream). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle seller price manipulation timed with ranking refresh | Randomised windows and anomaly detection. |

**Deliberately not doing**

- Seller review count: gameable.
- Seller registration age: weak.

**How the approach is proven**

Prove it offline on Predicted vs realised conversion and Customer-value regret using time-ordered splits, then online on "Defect rate of buy-box orders" with "Seller diversity" as the guardrail. Watch for: Outcomes confounded by Buy Box position and Seller metrics gamed.

## Baseline and production design

- **Baseline (build this first):** Rule-based lowest landed price with minimum performance.
- **Production design:** Conversion-and-experience model producing expected customer value per offer, with seller-health gating and exploration for new sellers.

## Why AI, and why this kind

**Why AI.** Select which seller wins the featured offer for each product based on price, speed, reliability and customer-experience. The evidence that separates good from bad outcomes (Landed price percentile, Seller defect rate, Delivery promise reliability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "lowest price wins" are what teams reach for first, and they fail because cheapest sellers with poor fulfilment cause returns. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Conversion-and-experience model producing expected customer value per offer, with seller-health gating and exploration for new sellers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Landed price percentile, Seller defect rate, Delivery promise reliability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based lowest landed price with minimum performance | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Conversion-and-experience model producing expected customer value per offer, with seller-health gating and exploration for new sellers | chosen | Meets the 80 ms envelope at $0.035 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Defect rate of buy-box orders) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Outcomes confounded by Buy Box position.
- Evaluation trap: Seller metrics gamed.
- Seller price manipulation timed with ranking refresh: sellers game the refresh window with brief price cuts to win the featured offer.
- New seller never wins: cold-start inequity.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
