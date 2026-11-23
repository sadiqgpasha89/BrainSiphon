# Tower Inspection with Drone Imagery: use-case brief

> Generated from the blueprint `telecom/tower-inspection-drone-imagery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tower Inspection with Drone Imagery · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find corrosion, loose fittings, antenna misalignment and structural damage from drone and climber images so inspections are faster and safer. The system has to run as a scheduled batch job, inside these limits: Defects ranked by severity with the image location, Engineer confirms before any work order and Personnel safety rules maintained.

**Why it is hard.** The obvious approach is any visible mark, and it fails because surface marks are mostly benign. The second trap is in "Coverage": the real signal is complete image coverage by tower section, while teams usually reach for whatever the pilot captured.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $3.8K a month. A mistake is expensive in the way defects found early measures it.

**What success looks like.** Offline: Recall and precision per defect class, Severity agreement with engineers and Coverage completeness. Online: Inspection hours per tower, Defects found early and Climber hours. The launch is judged on "Inspection hours per tower" while "Defects found early" must not get worse.

## Objective, loss and constraints

**Business objective.** Find corrosion, loose fittings, antenna misalignment and structural damage from drone and climber images so inspections are faster and safer.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Defects ranked by severity with the image location
- Engineer confirms before any work order
- Personnel safety rules maintained
- Images processed within 1 hour per site
- No imagery of people stored

## The approach in one paragraph

Start with manual inspection of images by an engineer, because it is the standard and the measure for time saved. Then earn the move to a detector and segmenter for components and defects with calibrated severity, image registration for change over time, and a review tool that creates work orders, and only if it beats the baseline on Recall and precision per defect class and Severity agreement with engineers after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Defect detection score | Model confidence for a defect class at the location. Core output. Guard against: calibrated per class. |
| Add Defect growth between visits | Change in the same area over time. Progression. Guard against: needs image registration. |
| Add Component type | Antenna, mount, cable or structure. Severity rules. Guard against: from a component detector. |
| Run it as one pipeline | Image upload (object storage), Quality check (blur and coverage check), Component and defect detection (vision model), Registration and change (image alignment), Severity ranking (gradient boosting) and Work order (asset system), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle poor lighting | Quality gate and a reshoot request. |

**Deliberately not doing**

- Pilot name: irrelevant.
- Image brightness alone: acquisition artefact.
- Sky background: irrelevant.

**How the approach is proven**

Prove it offline on Recall and precision per defect class, Severity agreement with engineers and Coverage completeness using time-ordered splits, then online on "Inspection hours per tower" with "Defects found early" as the guardrail. Watch for: Treating all marks as defects, No coverage check and Ignoring image registration.

## Baseline and production design

- **Baseline (build this first):** Manual inspection of images by an engineer, because it is the standard and the measure for time saved.
- **Production design:** A detector and segmenter for components and defects with calibrated severity, image registration for change over time, and a review tool that creates work orders.

## Why AI, and why this kind

**Why AI.** Find corrosion, loose fittings, antenna misalignment and structural damage from drone and climber images so inspections are faster and safer. The evidence that separates good from bad outcomes (Defect detection score, Defect growth between visits, Component type) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any visible mark" are what teams reach for first, and they fail because surface marks are mostly benign. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detector and segmenter for components and defects with calibrated severity, image registration for change over time, and a review tool that creates work orders.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Defect detection score, Defect growth between visits, Component type and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual inspection of images by an engineer, because it is the standard and the measure for time saved | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detector and segmenter for components and defects with calibrated severity, image registration for change over time, and a review tool that creates work orders | chosen | Meets the run-window envelope at $4.20 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Inspection hours per tower) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating all marks as defects.
- Evaluation trap: No coverage check.
- Poor lighting: defects are missed in dark images.
- Occlusion: parts hidden by structure.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
