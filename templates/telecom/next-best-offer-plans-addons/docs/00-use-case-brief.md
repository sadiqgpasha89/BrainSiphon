# Next-Best-Offer for Plans & Add-ons: use-case brief

> Generated from the blueprint `telecom/next-best-offer-plans-addons` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Next-Best-Offer for Plans & Add-ons · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend the plan, add-on or device offer most likely to benefit the customer and the business in each channel with consent and fair-treatment rules applied. The system has to run in under 100 milliseconds, inside these limits: Response under 80 ms, Offers respect eligibility and consent and Fair-treatment rules prevent steering vulnerable customers into unsuitable products.

**Why it is hard.** The obvious approach is immediate take-up, and it fails because high take-up of unsuitable add-ons later becomes complaints. The second trap is in "Eligibility": the real signal is rules applied before ranking, while teams usually reach for ranking then filtering.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $12.7K a month. A mistake is expensive in the way complaints about offers measures it.

**What success looks like.** Offline: Recall at ten and NDCG, Calibration of acceptance and Suitability rule coverage. Online: Incremental revenue against holdout, Complaints about offers and Retention of accepting customers. The launch is judged on "Incremental revenue against holdout" while "Complaints about offers" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend the plan, add-on or device offer most likely to benefit the customer and the business in each channel with consent and fair-treatment rules applied.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Response under 80 ms
- Offers respect eligibility and consent
- Fair-treatment rules prevent steering vulnerable customers into unsuitable products
- Offers explained to agents
- 30M customers

## The approach in one paragraph

Start with most popular offer by segment, because it is simple and a standard comparison for personalisation. Then earn the move to a two-tower retrieval model with a re-ranker constrained by eligibility, consent and suitability rules, with an exploration share and a holdout for incremental value, and only if it beats the baseline on Recall at ten and NDCG and Calibration of acceptance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Usage versus plan fit | Share of allowance used and overage events. Plan upgrade or downgrade need. Guard against: per cycle. |
| Add Device age and upgrade eligibility | Device age and financing status. Device offer fit. Guard against: from the device record. |
| Add Past offer response | Accept and ignore history by offer type. Taste. Guard against: decay old events. |
| Run it as one pipeline | Eligibility filter (rules engine), Candidate retrieval (two-tower model), Re-ranker (gradient boosting), Suitability and consent gate (policy engine), Offer display (channel API), Response capture (event stream) and Holdout evaluation (experiment platform). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new offer | Exploration traffic and content features. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Time since last login alone: weak link.
- Offer image colour: no link to need.

**How the approach is proven**

Prove it offline on Recall at ten and NDCG, Calibration of acceptance and Suitability rule coverage using time-ordered splits, then online on "Incremental revenue against holdout" with "Complaints about offers" as the guardrail. Watch for: Optimising take-up only, Filtering after ranking and No holdout.

## Baseline and production design

- **Baseline (build this first):** Most popular offer by segment, because it is simple and a standard comparison for personalisation.
- **Production design:** A two-tower retrieval model with a re-ranker constrained by eligibility, consent and suitability rules, with an exploration share and a holdout for incremental value.

## Why AI, and why this kind

**Why AI.** Recommend the plan, add-on or device offer most likely to benefit the customer and the business in each channel with consent and fair-treatment rules applied. The evidence that separates good from bad outcomes (Usage versus plan fit, Device age and upgrade eligibility, Past offer response) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "immediate take-up" are what teams reach for first, and they fail because high take-up of unsuitable add-ons later becomes complaints. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: A two-tower retrieval model with a re-ranker constrained by eligibility, consent and suitability rules, with an exploration share and a holdout for incremental value.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Usage versus plan fit, Device age and upgrade eligibility, Past offer response and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Most popular offer by segment, because it is simple and a standard comparison for personalisation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A two-tower retrieval model with a re-ranker constrained by eligibility, consent and suitability rules, with an exploration share and a holdout for incremental value | chosen | Meets the 80 ms envelope at $0.070 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incremental revenue against holdout) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising take-up only.
- Evaluation trap: Filtering after ranking.
- New offer: the new offer has no response history.
- Vulnerable customer: an upsell is unsuitable.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
