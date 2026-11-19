# Rental Listing Scam Detection: use-case brief

> Generated from the blueprint `real-estate/rental-listing-scam-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Rental Listing Scam Detection · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect fake rental listings and advance-fee scams at posting time using text, images, price and account behaviour. The system has to run in under 100 milliseconds, inside these limits: Decision within 80 ms when a listing is submitted, Legitimate listings are rarely blocked, with a stated false-block ceiling and Landlords can appeal a block and get a human review.

**Why it is hard.** The obvious approach is text alone, and it fails because scammers reuse photos and templates but rewrite the words, so text alone is evaded. The second trap is in "Price": the real signal is price compared with similar homes in the same area, while teams usually reach for the absolute price.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $20.4K a month. A mistake is expensive in the way false blocks measures it.

**What success looks like.** Offline: PR-AUC at fixed FPR and Recall. Online: Scam exposure and False blocks. The launch is judged on "Scam exposure" while "False blocks" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect fake rental listings and advance-fee scams at posting time using text, images, price and account behaviour.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Decision within 80 ms when a listing is submitted
- Legitimate listings are rarely blocked, with a stated false-block ceiling
- Landlords can appeal a block and get a human review
- Personal data used only to detect fraud and kept to a minimum

## The approach in one paragraph

Start with rules on price and keywords, because portals start there. Then earn the move to real-time scoring with image-reuse search, price models and account graph features and a review queue, and only if it beats the baseline on PR-AUC at fixed FPR and Recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Image reuse | Perceptual-hash match against an index of images seen in other listings and on other sites. Stolen photos are the most common scam sign. Guard against: legitimate agents reuse images across their own listings. |
| Add Price vs market | Ratio of the asking rent to the median rent of similar homes nearby. Prices well below market are a lure. Guard against: rent control creates legitimate low rents. |
| Add Account age and velocity | Number of listings posted in the first 24 hours of an account's life. New accounts that post many listings are suspicious. Guard against: legitimate agencies onboard in bulk. |
| Run it as one pipeline | Posting API (portal), Feature service (Redis), Image reuse search (vector index), Scam model (boosting), Policy (rules) and Outcome log (Kafka), with Moderation queue off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legit low price | Add the rent-control context so legitimate low rents are not blocked. |

**Deliberately not doing**

- Title style: Writing style varies and is easily copied by scammers.
- Photo count: Not a reliable differentiator once image reuse is measured.
- Time posted: Weak relation, since scams are posted at all hours.

**How the approach is proven**

Prove it offline on PR-AUC at fixed FPR and Recall using time-ordered splits, then online on "Scam exposure" with "False blocks" as the guardrail. Watch for: The data contain reported scams only, which are the ones that victims noticed and Adversarial drift, since scammers change patterns once they are caught.

## Baseline and production design

- **Baseline (build this first):** Rules on price and keywords, because portals start there.
- **Production design:** Real-time scoring with image-reuse search, price models and account graph features and a review queue.

## Why AI, and why this kind

**Why AI.** Detect fake rental listings and advance-fee scams at posting time using text, images, price and account behaviour. The evidence that separates good from bad outcomes (Image reuse, Price vs market, Account age and velocity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "text alone" are what teams reach for first, and they fail because scammers reuse photos and templates but rewrite the words, so text alone is evaded. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Real-time scoring with image-reuse search, price models and account graph features and a review queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Image reuse, Price vs market, Account age and velocity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules on price and keywords, because portals start there | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Real-time scoring with image-reuse search, price models and account graph features and a review queue | chosen | Meets the 80 ms envelope at $0.113 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Scam exposure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: The data contain reported scams only, which are the ones that victims noticed.
- Evaluation trap: Adversarial drift, since scammers change patterns once they are caught.
- Legit low price: a genuinely low price under rent control looks like a scam.
- Reposted listing: a legitimate agent reposts the same listing and images.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
