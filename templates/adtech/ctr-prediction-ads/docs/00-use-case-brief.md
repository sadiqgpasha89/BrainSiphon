# Ad Click-Through Rate Prediction: use-case brief

> Generated from the blueprint `adtech/ctr-prediction-ads` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Click-Through Rate Prediction · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Every time a page loads, the ad server has a few hundred candidate ads and about 8 milliseconds to price them. The auction needs one number per candidate: the probability that this user, on this placement, at this moment, will click this ad. Bids are multiplied by that probability to decide who wins and what they pay, so the number is not a ranking score. It is a price input. The model sees billions of sparse identifiers, a feedback loop that only shows clicks on ads it chose to show, and a requirement to keep learning through the day as ads and creatives appear.

**Why it is hard.** Calibration matters more than ranking: an AUC of 0.8 with scores that are off by 20 percent misprices every auction and moves money between advertisers and the platform. Logs are biased by the old ranking, because ads shown at the top get more clicks and the model learns to repeat the previous ordering unless position is modelled and a randomised exploration slice is kept. Accidental taps on mobile banners inflate CTR and reward misleading creatives. New ads have no history, and a daily retrain starves them. And the serving budget leaves about 2 ms for inference over embedding tables too large for one machine, with versions that must match between training and serving or scores jump.

**Scale and stakes.** With 10 million registered and 3 million daily active users the system scores about 120 million candidate sets a day, 1,389 per second on average and 11,000 at peak, provisioned for 17,000 on about 28 L4 or L40S class GPUs, at an estimated $52.8K a month or $0.015 per thousand decisions. The cost is small against the revenue on the table: a half percent miscalibration is a persistent pricing error across every auction, and advertisers notice it in their return on spend before the platform notices it in its own dashboards.

**What success looks like.** Offline, normalised cross-entropy and log-loss improve over the baseline, AUC does not fall, and calibration is within a small tolerance for each placement. Online, the launch is judged on revenue per mille, with advertiser CTR satisfaction as the guardrail so that revenue is not bought with misleading creatives. The scorer stays inside its 2 ms inference budget and the 8 ms total, and new ads reach a fair amount of exposure within hours.

## Objective, loss and constraints

**Business objective.** Predict click probability for each ad candidate with calibrated outputs at millions of requests per second.

**Training objective.** `\mathcal{L}=-\sum_i\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- 2 ms inference budget
- Sparse categorical features with billions of IDs
- Online learning for freshness
- Calibration by segment

## The approach in one paragraph

Start with logistic regression on hashed feature crosses, which is cheap, fast to train and a tough baseline, and replace it with a DCN-v2 network over sharded embedding tables only where it improves normalised cross-entropy and holds calibration per placement. Online learning keeps the head fresh through the day, a per-segment calibration layer converts scores into prices the auction can trust, and position is modelled in training and neutralised at serving. The objective that decides success is revenue per mille with advertiser satisfaction held steady, not AUC.

**Moves**

| Move | Detail |
|---|---|
| Clean the label before improving the model | Filter clicks with very short dwell time, remove accidental taps from labels and from historical CTR features, and count only impressions that occurred before the one being scored. |
| Handle position as a variable, not a nuisance | Train with the slot as an input, set it to the top slot at serving so every candidate is compared as if it were shown first, and keep a small randomised exploration slice to measure position effects without the old ranking's bias. |
| Let the network learn the crosses | Hash sparse identifiers into embeddings and learn feature interactions with DCN-v2, because hand-made crosses cannot cover billions of ad and user pairs, while keeping ad-user embedding interaction, smoothed historical CTR, context and ad age as the main signals. |
| Update the head every hour | Apply FTRL-style online updates to the model head and ship embedding tables as versioned atomic swaps, so new ads are scored with current information and version skew never occurs mid-request. |
| Calibrate where the money is priced | Fit isotonic calibration per segment and placement, refresh it hourly, and alarm on the ratio of expected to observed clicks. |
| Give new ads a chance | Reserve an exploration budget and content-based priors for ads and formats with no history, and track their exposure separately. |

**Deliberately not doing**

- Use impression identifiers, advertiser name text or raw user agent strings: the first is random, the second duplicates the advertiser identifier and the third hashes thousands of rare variants into noise when device class already carries the signal.
- Retrain only daily: new ads cold-start badly, and the hour matters when campaigns launch.
- Learn click rates from logs ranked by the old model without modelling position: the model would learn the old ranking and punish ads that were never shown at the top.
- Optimise AUC alone: a well-ranked but miscalibrated score misprices every auction, and AUC cannot see it.

**How the approach is proven**

Offline, compare against the logistic baseline on normalised cross-entropy, log-loss and AUC on a strictly later time window, with calibration plotted per placement and segment. Online, run the new model on a small percentage of auctions with a matched control, and judge revenue per mille and advertiser CTR satisfaction, checking that expected clicks equal observed clicks within each placement before widening.

## Baseline and production design

- **Baseline (build this first):** Logistic regression with hashed feature crosses.
- **Production design:** DCN-v2 with embedding tables sharded across hosts, FTRL-style online updates for the head and quantised CPU serving.

## Why AI, and why this kind

**Why AI.** Predict click probability for each ad candidate with calibrated outputs at millions of requests per second. The evidence that separates good from bad outcomes (Ad-user embedding interaction, Historical CTR with smoothing, Context features) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "handcrafted crosses only" are what teams reach for first, and they fail because manual crosses cannot cover billions of ID pairs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: DCN-v2 with embedding tables sharded across hosts, FTRL-style online updates for the head and quantised CPU serving.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Ad-user embedding interaction, Historical CTR with smoothing, Context features and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Logistic regression with hashed feature crosses | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| DCN-v2 with embedding tables sharded across hosts, FTRL-style online updates for the head and quantised CPU serving | chosen | Meets the 8 ms envelope at $0.015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Revenue per mille) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- An embedding table is updated while serving, so a fraction of requests use the new version and the rest the old, and scores jump for that share of traffic.
- A new creative format has no history, its CTR is underestimated, and it never receives exposure to correct that.
- Accidental taps on mobile banners are counted as clicks, inflating CTR and rewarding misleading creatives.
- A site redesign changes the placement mix and calibration drifts for one segment while the average still looks fine.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
