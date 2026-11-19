# Ad Copy & Creative Compliance Moderation: use-case brief

> Generated from the blueprint `adtech/ad-copy-compliance-moderation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Copy & Creative Compliance Moderation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect policy-violating ads (misleading claims, prohibited products, restricted categories) at submission time with advertiser-facing explanations. The system has to run in under 100 milliseconds, inside these limits: Region-specific rules, Appeals within 24 hours and Review latency under minutes.

**Why it is hard.** The obvious approach is single violation score, and it fails because policies differ by market and category. The second trap is in "Evasion": the real signal is robustness to obfuscated text and imagery, while teams usually reach for keyword filters.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.3K a month. A mistake is expensive in the way wrongful rejection rate measures it.

**What success looks like.** Offline: Per-policy precision and recall and Time to decision. Online: Policy violation exposure and Wrongful rejection rate. The launch is judged on "Policy violation exposure" while "Wrongful rejection rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect policy-violating ads (misleading claims, prohibited products, restricted categories) at submission time with advertiser-facing explanations.

**Training objective.** `\mathcal{L}=\sum_k w_k\,\mathrm{BCE}(y_k,p_k)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_k | A weight that scales how much a particular example, class or term counts in the loss. (one value per class or label k) |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_k | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per class or label k) |
| p_k | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per class or label k) |

**Hard constraints**

- Region-specific rules
- Appeals within 24 hours
- Review latency under minutes
- Explainable rejections

## The approach in one paragraph

Start with keyword blocklists plus manual review. Then earn the move to multimodal policy classifiers with claim verification, advertiser risk tiers and human review for the uncertain band, and only if it beats the baseline on Per-policy precision and recall and Time to decision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Policy category scores | Multi-label scores. Routing. Guard against: calibration. |
| Add Claim detection | Health or financial claim detector. Regulated claims. Guard against: taxonomy. |
| Add Advertiser trust tier | History of violations. Context. Guard against: history. |
| Run it as one pipeline | Ad submission (platform), Text and image models (multimodal classifier), Claim verifier (rules and retrieval), Policy engine (region thresholds) and Appeals (human), with Reviewer queue and Label feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new regulation introduces a restricted category | Rule-first rollout with rapid labelling. |

**Deliberately not doing**

- Ad ID: none.
- Bid: none.

**How the approach is proven**

Prove it offline on Per-policy precision and recall and Time to decision using time-ordered splits, then online on "Policy violation exposure" with "Wrongful rejection rate" as the guardrail. Watch for: Labels from past inconsistent reviewers and Static adversarial test set.

## Baseline and production design

- **Baseline (build this first):** Keyword blocklists plus manual review.
- **Production design:** Multimodal policy classifiers with claim verification, advertiser risk tiers and human review for the uncertain band.

## Why AI, and why this kind

**Why AI.** Detect policy-violating ads (misleading claims, prohibited products, restricted categories) at submission time with advertiser-facing explanations. The evidence that separates good from bad outcomes (Policy category scores, Claim detection, Advertiser trust tier) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single violation score" are what teams reach for first, and they fail because policies differ by market and category. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multimodal policy classifiers with claim verification, advertiser risk tiers and human review for the uncertain band.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Policy category scores, Claim detection, Advertiser trust tier and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword blocklists plus manual review | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multimodal policy classifiers with claim verification, advertiser risk tiers and human review for the uncertain band | chosen | Meets the 80 ms envelope at $0.682 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Policy violation exposure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from past inconsistent reviewers.
- Evaluation trap: Static adversarial test set.
- New regulation introduces a restricted category: classifiers have no examples.
- Adversarial creative obfuscation: violations pass.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
