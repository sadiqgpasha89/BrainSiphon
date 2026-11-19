# Credit Card Offer Personalisation: use-case brief

> Generated from the blueprint `fintech/credit-card-offer-personalization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Card Offer Personalisation · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Show each customer the card or reward offer with the highest expected lifetime value subject to eligibility and risk policy. The system has to run in under 100 milliseconds, inside these limits: Pre-approval eligibility filters, Fair-lending rules and Offer must be explainable.

**Why it is hard.** The obvious approach is maximising clicks, and it fails because clicks on cards that decline or default lose money. The second trap is in "Eligibility": the real signal is eligibility computed before ranking, while teams usually reach for rank then filter.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $12.6K a month. A mistake is expensive in the way profit per offer shown measures it.

**What success looks like.** Offline: Offer ranking NDCG on profit-weighted conversions and Approval-rate calibration. Online: Booked accounts per impression and Profit per offer shown. The launch is judged on "Booked accounts per impression" while "Profit per offer shown" must not get worse.

## Objective, loss and constraints

**Business objective.** Show each customer the card or reward offer with the highest expected lifetime value subject to eligibility and risk policy.

**Training objective.** `\mathcal{L}=-\sum_{(u,o)}\left[c_{uo}\log\sigma(s_{uo})+(1-c_{uo})\log(1-\sigma(s_{uo}))\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(u,o)} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| c_{uo} | Whether user u accepted offer o: c_{uo} is 1 if accepted. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \sigma | Sigmoid function: turns the score into a probability. |
| s_{uo} | The model's score for showing offer o to user u. |

**Hard constraints**

- Pre-approval eligibility filters
- Fair-lending rules
- Offer must be explainable
- 60 ms

## The approach in one paragraph

Start with rules by segment (spend profile, credit tier). Then earn the move to two-stage: eligibility service then multi-objective ranker (take-up, approval, profit) with exploration, served from a feature store, and only if it beats the baseline on Offer ranking NDCG on profit-weighted conversions and Approval-rate calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pre-approval probability | Model score for approval of this offer. Avoids dead-end clicks. Guard against: compute with current bureau pull date. |
| Add Spend category affinity | Share of spend in offer's reward category. Reward relevance. Guard against: trailing 6 months excluding offer period. |
| Add Expected profit margin | Model-based NPV of acquiring this customer. Business value. Guard against: uses forward-looking estimates with lag. |
| Run it as one pipeline | Offer request (app backend), Eligibility service (policy engine), Feature lookup (online store), Offer ranker (multi-task GBDT), Exploration layer (Thompson sampling), Display API (response) and Outcome events (attribution). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle rate change invalidates offers | Offer catalogue versioning and TTL. |

**Deliberately not doing**

- Browsing dwell time: high variance and gameable.
- Device brand: proxy for income with fairness risk.

**How the approach is proven**

Prove it offline on Offer ranking NDCG on profit-weighted conversions and Approval-rate calibration using time-ordered splits, then online on "Booked accounts per impression" with "Profit per offer shown" as the guardrail. Watch for: Training on clicks ignores approval outcome and Selection bias from past rules-based targeting.

## Baseline and production design

- **Baseline (build this first):** Rules by segment (spend profile, credit tier).
- **Production design:** Two-stage: eligibility service then multi-objective ranker (take-up, approval, profit) with exploration, served from a feature store.

## Why AI, and why this kind

**Why AI.** Show each customer the card or reward offer with the highest expected lifetime value subject to eligibility and risk policy. The evidence that separates good from bad outcomes (Pre-approval probability, Spend category affinity, Expected profit margin) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "maximising clicks" are what teams reach for first, and they fail because clicks on cards that decline or default lose money. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Two-stage: eligibility service then multi-objective ranker (take-up, approval, profit) with exploration, served from a feature store.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pre-approval probability, Spend category affinity, Expected profit margin and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules by segment (spend profile, credit tier) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-stage: eligibility service then multi-objective ranker (take-up, approval, profit) with exploration, served from a feature store | chosen | Meets the 80 ms envelope at $0.046 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Booked accounts per impression) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on clicks ignores approval outcome.
- Evaluation trap: Selection bias from past rules-based targeting.
- Rate change invalidates offers: stale offers shown.
- Cold-start new customers: ranker falls back to popularity.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
