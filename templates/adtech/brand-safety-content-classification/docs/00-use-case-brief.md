# Brand-Safety Content Classification: use-case brief

> Generated from the blueprint `adtech/brand-safety-content-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Brand-Safety Content Classification · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect unsafe or unsuitable content (violence, hate, adult, misinformation) near ads at page, video and stream level with fine-grained brand controls. The system has to run in under 100 milliseconds, inside these limits: Advertiser-defined suitability tiers, Video frames and audio and Precision to avoid over-blocking publishers.

**Why it is hard.** The obvious approach is binary safe/unsafe, and it fails because brands differ in risk appetite. The second trap is in "Over-blocking": the real signal is measure publisher revenue loss from false blocks, while teams usually reach for maximise recall only.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $260.7K a month. A mistake is expensive in the way publisher revenue retention measures it.

**What success looks like.** Offline: Per-category precision and recall and False block rate on news. Online: Brand-safety incident rate and Publisher revenue retention. The launch is judged on "Brand-safety incident rate" while "Publisher revenue retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect unsafe or unsuitable content (violence, hate, adult, misinformation) near ads at page, video and stream level with fine-grained brand controls.

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

- Advertiser-defined suitability tiers
- Video frames and audio
- Precision to avoid over-blocking publishers
- Appeals

## The approach in one paragraph

Start with keyword blocklists. Then earn the move to multimodal classifier with calibrated category scores, brand-specific thresholds and human review for appeals, cached at page/video level, and only if it beats the baseline on Per-category precision and recall and False block rate on news after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Category probabilities | Multi-label scores per risk category. Controls. Guard against: calibration. |
| Add Video-frame risk aggregation | Max and mean frame risk. Video decisions. Guard against: sampling rate. |
| Add Page-level context | Headline and surrounding text. Context. Guard against: cleaning. |
| Run it as one pipeline | Content crawl and frames (ingest), Text classifier (transformer), Video classifier (frame and audio models), Score aggregator (per-category), Brand policy engine (thresholds) and Block logs (analytics), with Appeals review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle news about sensitive events gets blocked broadly | Context-aware classification separating reporting from endorsement. |

**Deliberately not doing**

- Ad slot position: none.
- Publisher size: none.

**How the approach is proven**

Prove it offline on Per-category precision and recall and False block rate on news using time-ordered splits, then online on "Brand-safety incident rate" with "Publisher revenue retention" as the guardrail. Watch for: Training on keyword-labelled data and Test sets lacking news edge cases.

## Baseline and production design

- **Baseline (build this first):** Keyword blocklists.
- **Production design:** Multimodal classifier with calibrated category scores, brand-specific thresholds and human review for appeals, cached at page/video level.

## Why AI, and why this kind

**Why AI.** Detect unsafe or unsuitable content (violence, hate, adult, misinformation) near ads at page, video and stream level with fine-grained brand controls. The evidence that separates good from bad outcomes (Category probabilities, Video-frame risk aggregation, Page-level context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "binary safe/unsafe" are what teams reach for first, and they fail because brands differ in risk appetite. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multimodal classifier with calibrated category scores, brand-specific thresholds and human review for appeals, cached at page/video level.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Category probabilities, Video-frame risk aggregation, Page-level context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword blocklists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multimodal classifier with calibrated category scores, brand-specific thresholds and human review for appeals, cached at page/video level | chosen | Meets the 80 ms envelope at $0.097 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Brand-safety incident rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on keyword-labelled data.
- Evaluation trap: Test sets lacking news edge cases.
- News about sensitive events gets blocked broadly: news publishers lose revenue.
- Adversarial text obfuscation by bad actors: unsafe pages pass.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
