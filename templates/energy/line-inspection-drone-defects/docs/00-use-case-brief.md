# Line Inspection Drone Defect Detection: use-case brief

> Generated from the blueprint `energy/line-inspection-drone-defects` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Line Inspection Drone Defect Detection · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect damaged insulators, corroded hardware, cracked crossarms and missing parts in drone and helicopter imagery of lines and poles so crews target the real defects. The system has to run as a scheduled batch job, inside these limits: Defect list per structure with the image evidence, Recall above 90% for critical defects and Inspector confirms before a work order.

**Why it is hard.** The obvious approach is image tags from the vendor, and it fails because vendor tags vary in quality. The second trap is in "Priority": the real signal is defect severity and structure criticality, while teams usually reach for detection count.

**Scale and stakes.** At 10 million users this is about 150.0M model-touching events a day, 1.7K requests per second on average and 1.7K at peak, at an estimated $985.8K a month. A mistake is expensive in the way defects found per survey measures it.

**What success looks like.** Offline: Recall by defect class and severity, Precision at inspector review and Calibration. Online: Inspector review time, Defects found per survey and Failures from missed defects. The launch is judged on "Inspector review time" while "Defects found per survey" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect damaged insulators, corroded hardware, cracked crossarms and missing parts in drone and helicopter imagery of lines and poles so crews target the real defects.

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

- Defect list per structure with the image evidence
- Recall above 90% for critical defects
- Inspector confirms before a work order
- Images retained with model version
- 2M images per month

## The approach in one paragraph

Start with manual image review by inspectors, because it is the current method and the quality reference. Then earn the move to an object detection model on structure crops with severity scoring, calibrated per defect class, an inspector review queue and a feedback loop to retraining, and only if it beats the baseline on Recall by defect class and severity and Precision at inspector review after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Defect class scores | Model score per defect type. Core signal. Guard against: calibrated per class. |
| Add Image quality | Focus, lighting and distance. Reliability. Guard against: from the image. |
| Add Structure criticality | Voltage level and customers served. Priority. Guard against: from GIS. |
| Run it as one pipeline | Image ingestion (drone and helicopter surveys), Structure matching (GIS join), Defect detection (vision model), Severity and criticality scoring (rules) and Work order proposal (asset system), with Inspector review and Feedback and retraining off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle poor image | Quality filter and a re-fly request. |

**Deliberately not doing**

- Drone operator name: irrelevant.
- Flight id: an identifier.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Recall by defect class and severity, Precision at inspector review and Calibration using time-ordered splits, then online on "Inspector review time" with "Defects found per survey" as the guardrail. Watch for: Using detection count as priority, Vendor tags as labels and Ignoring image quality.

## Baseline and production design

- **Baseline (build this first):** Manual image review by inspectors, because it is the current method and the quality reference.
- **Production design:** An object detection model on structure crops with severity scoring, calibrated per defect class, an inspector review queue and a feedback loop to retraining.

## Why AI, and why this kind

**Why AI.** Detect damaged insulators, corroded hardware, cracked crossarms and missing parts in drone and helicopter imagery of lines and poles so crews target the real defects. The evidence that separates good from bad outcomes (Defect class scores, Image quality, Structure criticality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "image tags from the vendor" are what teams reach for first, and they fail because vendor tags vary in quality. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: An object detection model on structure crops with severity scoring, calibrated per defect class, an inspector review queue and a feedback loop to retraining.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Defect class scores, Image quality, Structure criticality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual image review by inspectors, because it is the current method and the quality reference | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An object detection model on structure crops with severity scoring, calibrated per defect class, an inspector review queue and a feedback loop to retraining | chosen | Meets the run-window envelope at $0.219 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Inspector review time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using detection count as priority.
- Evaluation trap: Vendor tags as labels.
- Poor image: glare hides the component.
- New hardware type: the model has not seen it.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
