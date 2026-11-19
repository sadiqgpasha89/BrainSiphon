# Floor-Plan Extraction from Images: use-case brief

> Generated from the blueprint `real-estate/floor-plan-extraction-from-images` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Floor-Plan Extraction from Images · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours. The system has to run interactively, within a few seconds, inside these limits: Total area within 3 percent of the stated area on supported plans, Every extracted room carries a label and a confidence and Both metric and imperial dimensions read correctly.

**Why it is hard.** The obvious approach is pixel masks alone, and it fails because search, valuation and 3D tours need vectors with dimensions, not a picture of walls. The second trap is in "Scale": the real signal is scale recovered from printed dimension text or a known reference, while teams usually reach for an assumed fixed scale.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $15.1K a month. A mistake is expensive in the way 3D tour conversion measures it.

**What success looks like.** Offline: Room IoU and Area error. Online: Manual tracing hours saved and 3D tour conversion. The launch is judged on "Manual tracing hours saved" while "3D tour conversion" must not get worse.

## Objective, loss and constraints

**Business objective.** Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathcal{L}_{\text{CTC}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{seg}} | Segmentation loss: how well the region of interest is outlined pixel by pixel. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{CTC}} | Connectionist temporal classification loss: aligns a signal such as audio or a line image with its text without frame-by-frame labels. |

**Hard constraints**

- Total area within 3 percent of the stated area on supported plans
- Every extracted room carries a label and a confidence
- Both metric and imperial dimensions read correctly
- Low-confidence plans go to a human correction tool and not to publication

## The approach in one paragraph

Start with manual tracing by operators, because it is accurate and slow. Then earn the move to segmentation with OCR and a vectoriser, plus consistency checks and a human correction tool, and only if it beats the baseline on Room IoU and Area error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Wall segmentation | Intersection-over-union of the predicted wall mask against labelled plans. The base of the geometry. Guard against: clutter such as furniture symbols and hatching confuses the mask, so evaluate per drawing style. |
| Add Dimension OCR | Recognised numbers and units next to walls, converted to metres. Gives the scale for the whole plan. Guard against: a misread digit changes the scale by ten, so validate against the stated area. |
| Add Room label OCR | Recognised room names mapped to a fixed room taxonomy. Adds meaning to the geometry. Guard against: names are in many languages and abbreviations, so normalise by locale. |
| Run it as one pipeline | Image upload (portal), Preprocessor (normaliser), Wall and room model (segmentation model), OCR (text recognition), Vectoriser (geometry), Validator (rules) and Correction tool (web). |
| Optimise the right thing | The objective weighs segmentation loss: how well the region of interest is outlined pixel by pixel, so the model is trained on the cost of the decision and not on a generic score. |
| Handle hand-drawn plans | Detect low-confidence geometry and send the plan to the correction tool. |

**Deliberately not doing**

- Colour: A style choice of the drawing that does not change the layout.
- Watermark: Overlaid text that the model should ignore and not read as a label.
- Compass: Orientation marks carry no geometry or area information.

**How the approach is proven**

Prove it offline on Room IoU and Area error using time-ordered splits, then online on "Manual tracing hours saved" with "3D tour conversion" as the guardrail. Watch for: Training on clean CAD exports hides failures on the hand-drawn and scanned plans that most listings contain and Template leakage when the same architect's drawings appear in both training and test.

## Baseline and production design

- **Baseline (build this first):** Manual tracing by operators, because it is accurate and slow.
- **Production design:** Segmentation with OCR and a vectoriser, plus consistency checks and a human correction tool.

## Why AI, and why this kind

**Why AI.** Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours. The evidence that separates good from bad outcomes (Wall segmentation, Dimension OCR, Room label OCR) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pixel masks alone" are what teams reach for first, and they fail because search, valuation and 3D tours need vectors with dimensions, not a picture of walls. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Segmentation with OCR and a vectoriser, plus consistency checks and a human correction tool.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Wall segmentation, Dimension OCR, Room label OCR and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual tracing by operators, because it is accurate and slow | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Segmentation with OCR and a vectoriser, plus consistency checks and a human correction tool | chosen | Meets the 2500 ms envelope at $3.35 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Manual tracing hours saved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on clean CAD exports hides failures on the hand-drawn and scanned plans that most listings contain.
- Evaluation trap: Template leakage when the same architect's drawings appear in both training and test.
- Hand-drawn plans: hand-drawn plans are irregular and the wall detector fails.
- Multi-floor sheets: a sheet holds several floors and they are merged into one.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
