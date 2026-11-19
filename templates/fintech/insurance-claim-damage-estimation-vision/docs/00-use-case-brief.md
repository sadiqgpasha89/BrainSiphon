# Vehicle Damage Estimation from Photos: use-case brief

> Generated from the blueprint `fintech/insurance-claim-damage-estimation-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vehicle Damage Estimation from Photos · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate repair cost from customer photos within seconds, enabling instant settlement of simple claims. The system has to run interactively, within a few seconds, inside these limits: Settlement accuracy within 10%, Photo fraud detection and Works with phone photos in poor light.

**Why it is hard.** The obvious approach is whatever the customer uploads, and it fails because missing angles are the main error source. The second trap is in "Cost": the real signal is part-level damage mapped to repair-shop labour and part prices, while teams usually reach for end-to-end image-to-cost regression.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $18.0K a month. A mistake is expensive in the way supplement (re-estimate) rate measures it.

**What success looks like.** Offline: Mean absolute percentage error vs final repair cost and Part-level IoU. Online: Straight-through settlement rate and Supplement (re-estimate) rate. The launch is judged on "Straight-through settlement rate" while "Supplement (re-estimate) rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate repair cost from customer photos within seconds, enabling instant settlement of simple claims.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{seg}}+\mathcal{L}_{\text{cls}}+\lambda\,\mathrm{Huber}(\text{cost},\widehat{\text{cost}})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{seg}} | Segmentation loss: how well the damaged region of the vehicle is outlined. |
| \mathcal{L}_{\text{cls}} | Classification loss: how well the type of damage is identified. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \text{cost} | The actual repair cost. |
| \widehat{\text{cost}} | The model's predicted repair cost. |

**Hard constraints**

- Settlement accuracy within 10%
- Photo fraud detection
- Works with phone photos in poor light
- Human override

## The approach in one paragraph

Start with adjuster manual estimate from photos. Then earn the move to part-aware segmentation (Mask2Former) feeding repair-line prediction and a regional parts-and-labour price service, with confidence-based human review, and only if it beats the baseline on Mean absolute percentage error vs final repair cost and Part-level IoU after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Damaged part segmentation | Mask and severity per vehicle part. Maps to repair operations. Guard against: use a part taxonomy per model year. |
| Add Photo integrity score | EXIF, duplication and manipulation checks. Photo fraud. Guard against: reverse-image search against prior claims. |
| Add Vehicle identification | Make, model, year from VIN and image. Parts price lookup. Guard against: decode VIN before image model. |
| Run it as one pipeline | Guided capture app (mobile SDK), Image quality gate (blur and angle check), Damage segmentation (Mask2Former on GPU), Repair-line estimator (GBDT), Price service (parts and labour API) and Settlement outcomes (final repair cost), with Adjuster review off the critical path. |
| Optimise the right thing | The objective weighs segmentation loss: how well the damaged region of the vehicle is outlined, so the model is trained on the cost of the decision and not on a generic score. |
| Handle pre-existing damage | Cross-check against previous claims and photo history. |

**Deliberately not doing**

- Image aspect ratio: device-specific artefact.
- Weather in the photo: environment, not damage.

**How the approach is proven**

Prove it offline on Mean absolute percentage error vs final repair cost and Part-level IoU using time-ordered splits, then online on "Straight-through settlement rate" with "Supplement (re-estimate) rate" as the guardrail. Watch for: Training on estimates instead of final invoices and Only easy claims in test set.

## Baseline and production design

- **Baseline (build this first):** Adjuster manual estimate from photos.
- **Production design:** Part-aware segmentation (Mask2Former) feeding repair-line prediction and a regional parts-and-labour price service, with confidence-based human review.

## Why AI, and why this kind

**Why AI.** Estimate repair cost from customer photos within seconds, enabling instant settlement of simple claims. The evidence that separates good from bad outcomes (Damaged part segmentation, Photo integrity score, Vehicle identification) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "whatever the customer uploads" are what teams reach for first, and they fail because missing angles are the main error source. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Part-aware segmentation (Mask2Former) feeding repair-line prediction and a regional parts-and-labour price service, with confidence-based human review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Damaged part segmentation, Photo integrity score, Vehicle identification and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Adjuster manual estimate from photos | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Part-aware segmentation (Mask2Former) feeding repair-line prediction and a regional parts-and-labour price service, with confidence-based human review | chosen | Meets the 2500 ms envelope at $4.00 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Straight-through settlement rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on estimates instead of final invoices.
- Evaluation trap: Only easy claims in test set.
- Pre-existing damage: prior damage is counted.
- Rare vehicle models: parts mapping missing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
