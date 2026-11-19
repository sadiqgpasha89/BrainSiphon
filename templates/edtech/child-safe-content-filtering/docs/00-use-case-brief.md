# Child-Safe Content Filtering: use-case brief

> Generated from the blueprint `edtech/child-safe-content-filtering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Child-Safe Content Filtering · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material. The system has to run in under 100 milliseconds, inside these limits: Age bands, Legal compliance (COPPA, GDPR-K) and Educational context (biology, history).

**Why it is hard.** The obvious approach is keyword blocklists, and it fails because blocklists block biology and history lessons. The second trap is in "Escalation": the real signal is safeguarding signals routed to staff, while teams usually reach for block and forget.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $80.2K a month. A mistake is expensive in the way educator complaints about over-blocking measures it.

**What success looks like.** Offline: Per-category precision and recall and Over-blocking rate on curriculum content. Online: Unsafe content exposure and Educator complaints about over-blocking. The launch is judged on "Unsafe content exposure" while "Educator complaints about over-blocking" must not get worse.

## Objective, loss and constraints

**Business objective.** Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material.

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

- Age bands
- Legal compliance (COPPA, GDPR-K)
- Educational context (biology, history)
- Fast inline decisions

## The approach in one paragraph

Start with keyword blocklists and manual moderation. Then earn the move to multimodal classifiers with age-band thresholds, educational-context scoring and a safeguarding escalation pipeline with trained staff, and only if it beats the baseline on Per-category precision and recall and Over-blocking rate on curriculum content after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Category scores by age band | Age-conditioned policy. Appropriate thresholds. Guard against: policy definition. |
| Add Educational-context score | Topic and source trust. Reduce over-blocking. Guard against: classifier. |
| Add Contact-risk signals | Adult-to-minor patterns. Grooming risk. Guard against: privacy. |
| Run it as one pipeline | Content and chat (platform), Text and image classifiers (multimodal models), Context scorer (topic model) and Age-band policy (thresholds), with Safeguarding queue, Parent and teacher controls and Audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle medical biology textbook flagged | Educational-source allow-lists and context scoring. |

**Deliberately not doing**

- Message length: weak.
- Emoji count: weak.

**How the approach is proven**

Prove it offline on Per-category precision and recall and Over-blocking rate on curriculum content using time-ordered splits, then online on "Unsafe content exposure" with "Educator complaints about over-blocking" as the guardrail. Watch for: Test data without educational content and Ignoring age-band differences.

## Baseline and production design

- **Baseline (build this first):** Keyword blocklists and manual moderation.
- **Production design:** Multimodal classifiers with age-band thresholds, educational-context scoring and a safeguarding escalation pipeline with trained staff.

## Why AI, and why this kind

**Why AI.** Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material. The evidence that separates good from bad outcomes (Category scores by age band, Educational-context score, Contact-risk signals) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "keyword blocklists" are what teams reach for first, and they fail because blocklists block biology and history lessons. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multimodal classifiers with age-band thresholds, educational-context scoring and a safeguarding escalation pipeline with trained staff.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Category scores by age band, Educational-context score, Contact-risk signals and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword blocklists and manual moderation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multimodal classifiers with age-band thresholds, educational-context scoring and a safeguarding escalation pipeline with trained staff | chosen | Meets the 80 ms envelope at $0.089 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unsafe content exposure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test data without educational content.
- Evaluation trap: Ignoring age-band differences.
- Medical biology textbook flagged: learning blocked.
- Coded language among teens: coded slang among teenagers evades filters and risky content is missed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
