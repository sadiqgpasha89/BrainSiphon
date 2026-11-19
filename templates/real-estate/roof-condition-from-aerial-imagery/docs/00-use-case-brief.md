# Roof Condition from Aerial Imagery: use-case brief

> Generated from the blueprint `real-estate/roof-condition-from-aerial-imagery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Roof Condition from Aerial Imagery · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify roof material, age and damage from aerial imagery for underwriting, maintenance and valuation. The system has to run as a scheduled batch job, inside these limits: The date of the imagery is shown with every grade, Results are for a single property and never a neighbourhood average and A person reviews any adverse decision based on the grade.

**Why it is hard.** The obvious approach is the colour of the roof, and it fails because colour misleads, since weathering turns many materials grey and paint changes it. The second trap is in "Condition": the real signal is a condition grade on a scale with defined levels, while teams usually reach for a binary good or bad flag.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $9.6K a month. A mistake is expensive in the way loss ratio measures it.

**What success looks like.** Offline: Condition accuracy and Material F1. Online: Inspection avoided and Loss ratio. The launch is judged on "Inspection avoided" while "Loss ratio" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify roof material, age and damage from aerial imagery for underwriting, maintenance and valuation.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{Ordinal}(\hat{q},q)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{seg}} | Segmentation loss: how well the region of interest is outlined pixel by pixel. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Ordinal} | An ordinal loss: penalises predictions by how far they fall from the true ordered grade. |
| \hat{q} | The model's predicted value at the chosen quantile. |
| q | Quantile level between 0 and 1, for example 0.9 for the 90th percentile. |

**Hard constraints**

- The date of the imagery is shown with every grade
- Results are for a single property and never a neighbourhood average
- A person reviews any adverse decision based on the grade
- Imagery licences are respected

## The approach in one paragraph

Start with inspector visits, because they are accurate and costly. Then earn the move to segmentation and classification with condition scoring and imagery age rules, and only if it beats the baseline on Condition accuracy and Material F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Roof segmentation | Intersection-over-union of the predicted roof mask with labelled outlines. The base for every other measure. Guard against: shadows and tree edges confuse the mask. |
| Add Material class | Predicted material from texture, such as tile, metal, asphalt or flat membrane. Material affects life expectancy and risk. Guard against: rare materials are under-represented. |
| Add Damage score | Model score for missing tiles, staining, patching and sagging. The direct condition signal. Guard against: resolution limits what the model can see. |
| Run it as one pipeline | Imagery (providers), Footprint match (geospatial), Roof model (vision), Condition scorer (model), Rules (policy) and Underwriter view (app), with Archive off the critical path. |
| Optimise the right thing | The objective weighs segmentation loss: how well the region of interest is outlined pixel by pixel, so the model is trained on the cost of the decision and not on a generic score. |
| Handle tree cover | Flag the occlusion and request another image or an inspection. |

**Deliberately not doing**

- Image tile: A division of the image that has no meaning for the roof.
- Sensor: The camera type changes appearance but not the roof condition.
- Cloud: Cloud shadow affects the image and not the condition of the roof.

**How the approach is proven**

Prove it offline on Condition accuracy and Material F1 using time-ordered splits, then online on "Inspection avoided" with "Loss ratio" as the guardrail. Watch for: The date of the imagery rarely matches the date of the decision, so errors rise in real use and Rare materials are under-represented, so average accuracy hides poor results for them.

## Baseline and production design

- **Baseline (build this first):** Inspector visits, because they are accurate and costly.
- **Production design:** Segmentation and classification with condition scoring and imagery age rules.

## Why AI, and why this kind

**Why AI.** Classify roof material, age and damage from aerial imagery for underwriting, maintenance and valuation. The evidence that separates good from bad outcomes (Roof segmentation, Material class, Damage score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the colour of the roof" are what teams reach for first, and they fail because colour misleads, since weathering turns many materials grey and paint changes it. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Segmentation and classification with condition scoring and imagery age rules.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Roof segmentation, Material class, Damage score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Inspector visits, because they are accurate and costly | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Segmentation and classification with condition scoring and imagery age rules | chosen | Meets the run-window envelope at $2.13 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Inspection avoided) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: The date of the imagery rarely matches the date of the decision, so errors rise in real use.
- Evaluation trap: Rare materials are under-represented, so average accuracy hides poor results for them.
- Tree cover: tree cover hides part of the roof so condition cannot be graded.
- Recent repair: a recent repair is not in a stale image.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
