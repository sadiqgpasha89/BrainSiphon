# Road Pavement Condition Assessment: use-case brief

> Generated from the blueprint `public-sector/road-pavement-condition-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Road Pavement Condition Assessment · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair. The system has to run as a scheduled batch job, inside these limits: Condition index per road segment with the image evidence, Safety hazards flagged to a person immediately and Engineer confirms before treatment.

**Why it is hard.** The obvious approach is image tags, and it fails because tags vary in quality. The second trap is in "Priority": the real signal is condition, traffic and treatment cost, while teams usually reach for damage count.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 694 at peak, at an estimated $316.7K a month. A mistake is expensive in the way roads in poor condition measures it.

**What success looks like.** Offline: Condition index error, Hazard recall and Segment ranking accuracy. Online: Cost per lane-kilometre treated, Roads in poor condition and Pothole complaints. The launch is judged on "Cost per lane-kilometre treated" while "Roads in poor condition" must not get worse.

## Objective, loss and constraints

**Business objective.** Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair.

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

- Condition index per road segment with the image evidence
- Safety hazards flagged to a person immediately
- Engineer confirms before treatment
- Faces and plates blurred
- 5K km of road per year

## The approach in one paragraph

Start with manual windshield surveys by engineers, because they are the quality reference. Then earn the move to a detection and segmentation model with condition indices per segment, a hazard rule, blurred imagery and a treatment optimiser tied to the budget, and only if it beats the baseline on Condition index error and Hazard recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Crack and pothole detection | Model score per defect. Condition. Guard against: calibrated. |
| Add Traffic volume and road class | Vehicles and class. Priority. Guard against: from the register. |
| Add Surface age and last treatment | Years since treatment. Deterioration. Guard against: from the asset system. |
| Run it as one pipeline | Image capture (survey vehicles), Blur sensitive content (vision model), Defect detection (vision model), Condition index (rules), Treatment optimiser (budget model) and Re-survey tracking (annual), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle wet road | Weather-aware filtering and re-survey. |

**Deliberately not doing**

- Vehicle name: irrelevant.
- Survey vendor: irrelevant.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Condition index error, Hazard recall and Segment ranking accuracy using time-ordered splits, then online on "Cost per lane-kilometre treated" with "Roads in poor condition" as the guardrail. Watch for: Raw image storage, Damage counts as priority and Image tags as truth.

## Baseline and production design

- **Baseline (build this first):** Manual windshield surveys by engineers, because they are the quality reference.
- **Production design:** A detection and segmentation model with condition indices per segment, a hazard rule, blurred imagery and a treatment optimiser tied to the budget.

## Why AI, and why this kind

**Why AI.** Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair. The evidence that separates good from bad outcomes (Crack and pothole detection, Traffic volume and road class, Surface age and last treatment) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "image tags" are what teams reach for first, and they fail because tags vary in quality. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detection and segmentation model with condition indices per segment, a hazard rule, blurred imagery and a treatment optimiser tied to the budget.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Crack and pothole detection, Traffic volume and road class, Surface age and last treatment and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual windshield surveys by engineers, because they are the quality reference | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detection and segmentation model with condition indices per segment, a hazard rule, blurred imagery and a treatment optimiser tied to the budget | chosen | Meets the run-window envelope at $0.176 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per lane-kilometre treated) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Raw image storage.
- Evaluation trap: Damage counts as priority.
- Wet road: glare hides cracks.
- Patches: repairs look like defects.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
