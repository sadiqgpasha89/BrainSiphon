# Catastrophe Loss Estimation from Imagery: use-case brief

> Generated from the blueprint `bfsi/catastrophe-loss-estimation-from-imagery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Catastrophe Loss Estimation from Imagery · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate insured damage within days of a catastrophe from aerial and satellite imagery combined with the policy book, so reserves and claims staffing are set early. The system has to run as a scheduled batch job, inside these limits: Estimates within 72 hours of imagery, Property-level results aggregated for reserving and Uncertainty reported.

**Why it is hard.** The obvious approach is pixel-level change on the whole scene, and it fails because debris and flooding change pixels without damaging insured structures. The second trap is in "Exposure": the real signal is join damage to insured values and deductibles, while teams usually reach for damage counts alone.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $4.2K a month. A mistake is expensive in the way claims staffing accuracy measures it.

**What success looks like.** Offline: Damage grade accuracy and Loss error versus final claims. Online: Early estimate error and Claims staffing accuracy. The launch is judged on "Early estimate error" while "Claims staffing accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate insured damage within days of a catastrophe from aerial and satellite imagery combined with the policy book, so reserves and claims staffing are set early.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{Huber}(\hat{y},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{seg}} | Segmentation loss: how well the region of interest is outlined pixel by pixel. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- Estimates within 72 hours of imagery
- Property-level results aggregated for reserving
- Uncertainty reported
- Imagery licence terms respected

## The approach in one paragraph

Start with catastrophe model loss estimates from the vendor, because insurers use them for early views. Then earn the move to building damage segmentation and grading fused with hazard footprints and policy terms, calibrated on early claims with intervals by region, and only if it beats the baseline on Damage grade accuracy and Loss error versus final claims after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Footprint damage grade | Classifier over pre and post imagery per footprint. Core input. Guard against: cloud and angle effects. |
| Add Hazard intensity | Wind speed or flood depth at the location. Physical driver. Guard against: hazard maps are modelled. |
| Add Construction class | Roof and wall type from the policy. Vulnerability. Guard against: data quality. |
| Run it as one pipeline | Imagery acquisition (satellite and aerial providers), Footprint matcher (geospatial join), Damage grader (vision model on GPU), Loss converter (vulnerability curves), Calibration (early claims regression) and Cat team dashboard (BI), with Estimate archive off the critical path. |
| Optimise the right thing | The objective weighs segmentation loss: how well the region of interest is outlined pixel by pixel, so the model is trained on the cost of the decision and not on a generic score. |
| Handle cloud cover | Fall back to hazard-only estimates and update when clear imagery arrives. |

**Deliberately not doing**

- Scene brightness: sensor effect.
- Image tile boundary: artefact.
- Satellite name: irrelevant.

**How the approach is proven**

Prove it offline on Damage grade accuracy and Loss error versus final claims using time-ordered splits, then online on "Early estimate error" with "Claims staffing accuracy" as the guardrail. Watch for: Training on one event type and Final claims differ from early claims.

## Baseline and production design

- **Baseline (build this first):** Catastrophe model loss estimates from the vendor, because insurers use them for early views.
- **Production design:** Building damage segmentation and grading fused with hazard footprints and policy terms, calibrated on early claims with intervals by region.

## Why AI, and why this kind

**Why AI.** Estimate insured damage within days of a catastrophe from aerial and satellite imagery combined with the policy book, so reserves and claims staffing are set early. The evidence that separates good from bad outcomes (Footprint damage grade, Hazard intensity, Construction class) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pixel-level change on the whole scene" are what teams reach for first, and they fail because debris and flooding change pixels without damaging insured structures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Building damage segmentation and grading fused with hazard footprints and policy terms, calibrated on early claims with intervals by region.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Footprint damage grade, Hazard intensity, Construction class and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Catastrophe model loss estimates from the vendor, because insurers use them for early views | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Building damage segmentation and grading fused with hazard footprints and policy terms, calibrated on early claims with intervals by region | chosen | Meets the run-window envelope at $2.31 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Early estimate error) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on one event type.
- Evaluation trap: Final claims differ from early claims.
- Cloud cover: cloud cover leaves no usable imagery for the affected area.
- Flood with no visible roof damage: structure harmed below the roofline.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
