# Invalid Traffic (IVT) Detection: use-case brief

> Generated from the blueprint `adtech/invalid-traffic-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Invalid Traffic (IVT) Detection · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify bot, hijacked-device and click-farm traffic across impressions and clicks before billing and bidding on it. The system has to run in under 100 milliseconds, inside these limits: Pre-bid decision in 5 ms, Post-bid refunds and MRC accreditation standards.

**Why it is hard.** The obvious approach is per-event rules, and it fails because individual events look human, the aggregates do not. The second trap is in "Adversary": the real signal is retrain on new tactics frequently, while teams usually reach for static models.

**Scale and stakes.** At 10 million users this is about 120.0M model-touching events a day, 1.4K requests per second on average and 8.3K at peak, at an estimated $10.0K a month. A mistake is expensive in the way advertiser refund requests measures it.

**What success looks like.** Offline: Precision and recall at fixed spend blocked and Refund accuracy. Online: Invalid traffic rate and Advertiser refund requests. The launch is judged on "Invalid traffic rate" while "Advertiser refund requests" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify bot, hijacked-device and click-farm traffic across impressions and clicks before billing and bidding on it.

**Training objective.** `\mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Pre-bid decision in 5 ms
- Post-bid refunds
- MRC accreditation standards
- Adversarial adaptation

## The approach in one paragraph

Start with blocklists and rule-based filters. Then earn the move to two-stage: fast pre-bid GBDT on aggregates, post-bid deep graph model for delayed refunds, with active learning from refund disputes, and only if it beats the baseline on Precision and recall at fixed spend blocked and Refund accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around IP and device request velocity | Requests per minute per entity. Bots are fast. Guard against: window before request. |
| Add Click-to-install time distribution | Time between click and install. Click injection. Guard against: matured installs. |
| Add Traffic source anomaly score | Deviation from publisher historical patterns. Site fraud. Guard against: baselines. |
| Run it as one pipeline | Event stream (Kafka), Entity aggregates (Flink), Pre-bid IVT scorer (GBDT), Post-bid graph model (GNN), Policy engine (block or refund) and Dispute outcomes (labels), with Fraud analyst off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate traffic spike from viral content | Publisher-baseline and content-event features. |

**Deliberately not doing**

- User-agent text: trivially faked.
- Referrer URL: forgeable.

**How the approach is proven**

Prove it offline on Precision and recall at fixed spend blocked and Refund accuracy using time-ordered splits, then online on "Invalid traffic rate" with "Advertiser refund requests" as the guardrail. Watch for: Labels only from detected fraud and Training on stale tactics.

## Baseline and production design

- **Baseline (build this first):** Blocklists and rule-based filters.
- **Production design:** Two-stage: fast pre-bid GBDT on aggregates, post-bid deep graph model for delayed refunds, with active learning from refund disputes.

## Why AI, and why this kind

**Why AI.** Identify bot, hijacked-device and click-farm traffic across impressions and clicks before billing and bidding on it. The evidence that separates good from bad outcomes (IP and device request velocity, Click-to-install time distribution, Traffic source anomaly score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-event rules" are what teams reach for first, and they fail because individual events look human, the aggregates do not. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Two-stage: fast pre-bid GBDT on aggregates, post-bid deep graph model for delayed refunds, with active learning from refund disputes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among IP and device request velocity, Click-to-install time distribution, Traffic source anomaly score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Blocklists and rule-based filters | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-stage: fast pre-bid GBDT on aggregates, post-bid deep graph model for delayed refunds, with active learning from refund disputes | chosen | Meets the 80 ms envelope at $0.0028 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Invalid traffic rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels only from detected fraud.
- Evaluation trap: Training on stale tactics.
- Legitimate traffic spike from viral content: flagged as bot flood.
- Sophisticated bots mimic human timing: bots that replicate human timing and mouse patterns evade the rules and recall falls.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
