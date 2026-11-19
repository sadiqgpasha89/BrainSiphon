# Pre-Launch Creative Performance Prediction: use-case brief

> Generated from the blueprint `adtech/pre-launch-creative-performance-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pre-Launch Creative Performance Prediction · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped. The system has to run interactively, within a few seconds, inside these limits: Cold-start creatives, Rank-ordering accuracy matters and Explainable feedback to designers.

**Why it is hard.** The obvious approach is absolute CTR regression, and it fails because absolute CTR varies by context far more than by creative. The second trap is in "Explanation": the real signal is attribute-level feedback (focal point, text size), while teams usually reach for opaque score.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $13.7K a month. A mistake is expensive in the way wasted spend on weak creatives measures it.

**What success looks like.** Offline: Pairwise ranking accuracy and Spearman correlation with realised CTR. Online: Share of top creatives chosen and Wasted spend on weak creatives. The launch is judged on "Share of top creatives chosen" while "Wasted spend on weak creatives" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\text{CTR},\widehat{\text{CTR}})+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \text{CTR} | The creative's true click-through rate measured after launch. |
| \widehat{\text{CTR}} | The model's predicted click-through rate before launch. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Cold-start creatives
- Rank-ordering accuracy matters
- Explainable feedback to designers
- Creative formats vary

## The approach in one paragraph

Start with heuristic checklists (text ratio, logo size). Then earn the move to multimodal encoder with contextual ranking head trained on within-campaign pairs, and attribute explanations from interpretable heads, and only if it beats the baseline on Pairwise ranking accuracy and Spearman correlation with realised CTR after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Visual embedding | Image or video encoder embedding. Content. Guard against: domain tuning. |
| Add Attention heatmap | Saliency prediction. Focus. Guard against: model. |
| Add Text-overlay legibility | OCR text size and contrast. Readability. Guard against: oCR. |
| Run it as one pipeline | Creative upload (studio), Format checker (rules), Embedding model (ViT or video encoder), Ranking head (pairwise model), Attribute explainer (interpretable heads) and Live performance (labels), with Designer feedback off the critical path. |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new visual trends shift performance drivers | Trend monitoring and frequent retraining. |

**Deliberately not doing**

- File size: none.
- Upload timestamp: none.

**How the approach is proven**

Prove it offline on Pairwise ranking accuracy and Spearman correlation with realised CTR using time-ordered splits, then online on "Share of top creatives chosen" with "Wasted spend on weak creatives" as the guardrail. Watch for: Training data confounded by budget and targeting and Absolute error reported instead of ranking quality.

## Baseline and production design

- **Baseline (build this first):** Heuristic checklists (text ratio, logo size).
- **Production design:** Multimodal encoder with contextual ranking head trained on within-campaign pairs, and attribute explanations from interpretable heads.

## Why AI, and why this kind

**Why AI.** Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped. The evidence that separates good from bad outcomes (Visual embedding, Attention heatmap, Text-overlay legibility) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "absolute CTR regression" are what teams reach for first, and they fail because absolute CTR varies by context far more than by creative. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multimodal encoder with contextual ranking head trained on within-campaign pairs, and attribute explanations from interpretable heads.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Visual embedding, Attention heatmap, Text-overlay legibility and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Heuristic checklists (text ratio, logo size) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multimodal encoder with contextual ranking head trained on within-campaign pairs, and attribute explanations from interpretable heads | chosen | Meets the 2500 ms envelope at $3.05 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Share of top creatives chosen) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training data confounded by budget and targeting.
- Evaluation trap: Absolute error reported instead of ranking quality.
- New visual trends shift performance drivers: predictions stale.
- Context mismatch between train and use: the context at use differs from training so creative rankings flip unexpectedly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
