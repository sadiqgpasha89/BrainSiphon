# Catalogue Image Quality & Compliance: use-case brief

> Generated from the blueprint `retail/catalog-image-quality-and-compliance` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Catalogue Image Quality & Compliance · **Domain:** retail · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Automatically check marketplace images for resolution, background, watermarks, text overlays and prohibited content at upload. The system has to run as a scheduled batch job, inside these limits: Throughput of millions of images per day, Policy changes monthly and Seller-facing explanations.

**Why it is hard.** The obvious approach is single pass/fail classifier, and it fails because policies differ by category and country. The second trap is in "Explanation": the real signal is region-level evidence (heatmaps, boxes), while teams usually reach for opaque rejection.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $3.4K a month. A mistake is expensive in the way seller time to listing measures it.

**What success looks like.** Offline: Per-policy precision and recall and Explanation fidelity. Online: Image rejection appeal overturn rate and Seller time to listing. The launch is judged on "Image rejection appeal overturn rate" while "Seller time to listing" must not get worse.

## Objective, loss and constraints

**Business objective.** Automatically check marketplace images for resolution, background, watermarks, text overlays and prohibited content at upload.

**Training objective.** `\mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)\quad\text{(multi-label policy heads)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_k | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per class or label k) |
| p_k | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per class or label k) |

**Hard constraints**

- Throughput of millions of images per day
- Policy changes monthly
- Seller-facing explanations
- Appeals workflow

## The approach in one paragraph

Start with rule checks on resolution and file size. Then earn the move to multi-head vision model (ViT) with segmentation-based checks, policy-config thresholds and seller-facing explanations, and only if it beats the baseline on Per-policy precision and recall and Explanation fidelity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Background uniformity | Segmentation-based white-background ratio. Policy for main image. Guard against: mask quality. |
| Add Watermark and overlay detector | Text overlay area ratio. Prohibited overlay. Guard against: oCR plus detection. |
| Add Product occupancy ratio | Product mask area over image area. Image usefulness. Guard against: segmentation consistency. |
| Run it as one pipeline | Upload event (object store trigger), Preprocessing (resize and normalise), Multi-head model (ViT on GPU), Policy engine (per-region rules) and Seller notification (explanation service), with Appeal queue and Label feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy update changes thresholds overnight | Policy versioning with dry-run impact analysis. |

**Deliberately not doing**

- JPEG quality alone: weakly related to policy.
- Image file name: seller-specific.

**How the approach is proven**

Prove it offline on Per-policy precision and recall and Explanation fidelity using time-ordered splits, then online on "Image rejection appeal overturn rate" with "Seller time to listing" as the guardrail. Watch for: Training on moderator labels with inconsistent policy interpretation and Test images from one region.

## Baseline and production design

- **Baseline (build this first):** Rule checks on resolution and file size.
- **Production design:** Multi-head vision model (ViT) with segmentation-based checks, policy-config thresholds and seller-facing explanations.

## Why AI, and why this kind

**Why AI.** Automatically check marketplace images for resolution, background, watermarks, text overlays and prohibited content at upload. The evidence that separates good from bad outcomes (Background uniformity, Watermark and overlay detector, Product occupancy ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single pass/fail classifier" are what teams reach for first, and they fail because policies differ by category and country. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multi-head vision model (ViT) with segmentation-based checks, policy-config thresholds and seller-facing explanations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Background uniformity, Watermark and overlay detector, Product occupancy ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule checks on resolution and file size | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-head vision model (ViT) with segmentation-based checks, policy-config thresholds and seller-facing explanations | chosen | Meets the run-window envelope at $0.754 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Image rejection appeal overturn rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on moderator labels with inconsistent policy interpretation.
- Evaluation trap: Test images from one region.
- Policy update changes thresholds overnight: mass re-rejection.
- Adversarial image perturbations: sellers add imperceptible noise or crops that evade the detector.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
