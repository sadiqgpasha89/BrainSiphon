# Size & Fit Recommendation: use-case brief

> Generated from the blueprint `retail/size-and-fit-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Size & Fit Recommendation · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend the right size per item and shopper to cut size-related returns without discouraging purchase. The system has to run in under 100 milliseconds, inside these limits: Brand-specific sizing, Privacy of body measurements and Under 50 ms.

**Why it is hard.** The obvious approach is purchased size as truth, and it fails because people keep ill-fitting items so purchased size is not the right size. The second trap is in "Returns": the real signal is return reason codes as supervision, while teams usually reach for returned equals wrong size.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $12.4K a month. A mistake is expensive in the way conversion on items with recommendation measures it.

**What success looks like.** Offline: Fit-class accuracy and Ordinal macro-F1. Online: Size-related return rate and Conversion on items with recommendation. The launch is judged on "Size-related return rate" while "Conversion on items with recommendation" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend the right size per item and shopper to cut size-related returns without discouraging purchase.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\text{fit class},p)+\lambda\,\mathrm{OrdinalPenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \text{fit class} | The fit outcome reported by the customer: too small, true to size or too large. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{OrdinalPenalty} | Extra penalty when the predicted fit is far from the true fit on the small-to-large scale. |

**Hard constraints**

- Brand-specific sizing
- Privacy of body measurements
- Under 50 ms
- New-brand cold start

## The approach in one paragraph

Start with brand size chart lookup by user height and weight. Then earn the move to bayesian latent-fit model (user and item latent sizes) with ordinal outputs and returns-calibrated recommendations, and only if it beats the baseline on Fit-class accuracy and Ordinal macro-F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Brand-size offset | Learned bias of a brand versus a reference scale. Cross-brand mapping. Guard against: estimated on matured returns. |
| Add Shopper anchor items | Sizes the user kept in similar brands. Personal calibration. Guard against: only kept items. |
| Add Garment measurements vs user profile | Difference between spec and user measures. Direct fit. Guard against: self-reported noise correction. |
| Run it as one pipeline | Product page request (API), User fit profile (feature store), Item latent size lookup (vector store), Fit model (Bayesian ordinal), Recommendation formatter (UI text), Cache (CDN) and Return reason feed (analytics). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle brand changes pattern mid-season | Per-item drift monitor and quick re-estimate. |

**Deliberately not doing**

- Item colour: not related to fit.
- Shopper age: proxy risk.

**How the approach is proven**

Prove it offline on Fit-class accuracy and Ordinal macro-F1 using time-ordered splits, then online on "Size-related return rate" with "Conversion on items with recommendation" as the guardrail. Watch for: Using kept items as correct without checking wear and Return reasons mis-selected by users.

## Baseline and production design

- **Baseline (build this first):** Brand size chart lookup by user height and weight.
- **Production design:** Bayesian latent-fit model (user and item latent sizes) with ordinal outputs and returns-calibrated recommendations.

## Why AI, and why this kind

**Why AI.** Recommend the right size per item and shopper to cut size-related returns without discouraging purchase. The evidence that separates good from bad outcomes (Brand-size offset, Shopper anchor items, Garment measurements vs user profile) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "purchased size as truth" are what teams reach for first, and they fail because people keep ill-fitting items so purchased size is not the right size. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Bayesian latent-fit model (user and item latent sizes) with ordinal outputs and returns-calibrated recommendations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Brand-size offset, Shopper anchor items, Garment measurements vs user profile and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Brand size chart lookup by user height and weight | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian latent-fit model (user and item latent sizes) with ordinal outputs and returns-calibrated recommendations | chosen | Meets the 80 ms envelope at $0.069 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Size-related return rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using kept items as correct without checking wear.
- Evaluation trap: Return reasons mis-selected by users.
- Brand changes pattern mid-season: latent size drifts.
- Gift purchases for someone else: wrong profile used.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
