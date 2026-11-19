# Marketplace UGC Moderation: use-case brief

> Generated from the blueprint `retail/ugc-content-moderation-marketplace` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Marketplace UGC Moderation · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Block prohibited listings, images and messages at submission while minimising wrongful removals. The system has to run in under 100 milliseconds, inside these limits: Policy per country, Appeals within 48 hours and Multi-modal content.

**Why it is hard.** The obvious approach is one toxic or not model, and it fails because policies differ by market and category. The second trap is in "Adversarial": the real signal is perceptual hashing plus adversarial augmentation, while teams usually reach for static keyword list.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $16.1K a month. A mistake is expensive in the way wrongful removal rate measures it.

**What success looks like.** Offline: Per-policy precision and recall and Appeal overturn rate. Online: Prohibited content exposure and Wrongful removal rate. The launch is judged on "Prohibited content exposure" while "Wrongful removal rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Block prohibited listings, images and messages at submission while minimising wrongful removals.

**Training objective.** `\mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_k | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per class or label k) |
| p_k | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per class or label k) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Policy per country
- Appeals within 48 hours
- Multi-modal content
- 80 ms synchronous gate

## The approach in one paragraph

Start with keyword lists and manual review. Then earn the move to multimodal policy classifier with perceptual hash prefilter, per-region thresholds, human review for the uncertain band and appeals loop, and only if it beats the baseline on Per-policy precision and recall and Appeal overturn rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Multi-label policy scores | Per-policy probabilities. Routing. Guard against: calibrated per region. |
| Add Hash match to known-bad | Perceptual hash distance. Cheap high-precision filter. Guard against: hash refresh. |
| Add Account trust level | Prior violations and tenure. Context. Guard against: as-of. |
| Run it as one pipeline | Submission API (listing service), Hash prefilter (perceptual hash index), Multimodal classifier (ViT and text encoder), Policy engine (region thresholds) and Appeals handling (human), with Moderator review and Label feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new scam trend | Rapid labelling pipeline and rule hotfix channel. |

**Deliberately not doing**

- Listing length: none.
- Posting time: none.

**How the approach is proven**

Prove it offline on Per-policy precision and recall and Appeal overturn rate using time-ordered splits, then online on "Prohibited content exposure" with "Wrongful removal rate" as the guardrail. Watch for: Labels from reviewer disagreement unresolved and Static test set.

## Baseline and production design

- **Baseline (build this first):** Keyword lists and manual review.
- **Production design:** Multimodal policy classifier with perceptual hash prefilter, per-region thresholds, human review for the uncertain band and appeals loop.

## Why AI, and why this kind

**Why AI.** Block prohibited listings, images and messages at submission while minimising wrongful removals. The evidence that separates good from bad outcomes (Multi-label policy scores, Hash match to known-bad, Account trust level) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one toxic or not model" are what teams reach for first, and they fail because policies differ by market and category. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multimodal policy classifier with perceptual hash prefilter, per-region thresholds, human review for the uncertain band and appeals loop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Multi-label policy scores, Hash match to known-bad, Account trust level and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword lists and manual review | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multimodal policy classifier with perceptual hash prefilter, per-region thresholds, human review for the uncertain band and appeals loop | chosen | Meets the 80 ms envelope at $0.178 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Prohibited content exposure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from reviewer disagreement unresolved.
- Evaluation trap: Static test set.
- New scam trend: a novel scam pattern is not in training data so recall drops until retraining.
- Culturally ambiguous content: inconsistent enforcement.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
