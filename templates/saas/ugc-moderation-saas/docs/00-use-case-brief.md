# UGC Moderation as a Service: use-case brief

> Generated from the blueprint `saas/ugc-moderation-saas` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** UGC Moderation as a Service · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Offer customers configurable moderation of text, images and video with per-tenant policies and audit trails. The system has to run in under 100 milliseconds, inside these limits: Per-tenant thresholds, Latency inline and Explainable decisions.

**Why it is hard.** The obvious approach is one fixed policy, and it fails because platforms differ in tolerance. The second trap is in "Review": the real signal is human review tooling and feedback loops, while teams usually reach for model-only.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $40.9K a month. A mistake is expensive in the way review workload measures it.

**What success looks like.** Offline: Per-category precision and recall and Calibration per tenant. Online: Violating content exposure and Review workload. The launch is judged on "Violating content exposure" while "Review workload" must not get worse.

## Objective, loss and constraints

**Business objective.** Offer customers configurable moderation of text, images and video with per-tenant policies and audit trails.

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

- Per-tenant thresholds
- Latency inline
- Explainable decisions
- Regional laws

## The approach in one paragraph

Start with keyword filters and manual review. Then earn the move to multimodal moderation models with per-tenant calibration, review queues and policy simulation before changes, and only if it beats the baseline on Per-category precision and recall and Calibration per tenant after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Category scores | Multi-label calibrated scores. Decision. Guard against: calibration. |
| Add Tenant feedback labels | Tenant overrides. Adaptation. Guard against: privacy. |
| Add Context signals | Thread and user history. Disambiguation. Guard against: data. |
| Run it as one pipeline | Content API (gateway), Text and image models (multimodal), Tenant policy engine (thresholds) and Policy simulator (replay), with Review queue, Decision audit and Feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle tenant policy change floods the review queue | Policy simulation and ramped rollout. |

**Deliberately not doing**

- Content length: weak.
- Upload time: weak.

**How the approach is proven**

Prove it offline on Per-category precision and recall and Calibration per tenant using time-ordered splits, then online on "Violating content exposure" with "Review workload" as the guardrail. Watch for: Test data from one tenant and Ignoring regional laws.

## Baseline and production design

- **Baseline (build this first):** Keyword filters and manual review.
- **Production design:** Multimodal moderation models with per-tenant calibration, review queues and policy simulation before changes.

## Why AI, and why this kind

**Why AI.** Offer customers configurable moderation of text, images and video with per-tenant policies and audit trails. The evidence that separates good from bad outcomes (Category scores, Tenant feedback labels, Context signals) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one fixed policy" are what teams reach for first, and they fail because platforms differ in tolerance. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multimodal moderation models with per-tenant calibration, review queues and policy simulation before changes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Category scores, Tenant feedback labels, Context signals and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword filters and manual review | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multimodal moderation models with per-tenant calibration, review queues and policy simulation before changes | chosen | Meets the 80 ms envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Violating content exposure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test data from one tenant.
- Evaluation trap: Ignoring regional laws.
- Tenant policy change floods the review queue: a tenant tightens its policy and the review queue is flooded with newly flagged content.
- Cross-tenant learning leaks data: learning shared across tenants can leak one tenant's content or policies to another.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
