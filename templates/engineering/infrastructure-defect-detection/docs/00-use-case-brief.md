# Infrastructure Defect Detection: use-case brief

> Generated from the blueprint `engineering/infrastructure-defect-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Infrastructure Defect Detection · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect cracks, spalling, corrosion and leaks in images of bridges, tunnels and pipes and rank defects by severity for inspection engineers to confirm and schedule. The system has to run as a scheduled batch job, inside these limits: Inspector confirms every defect before work orders, Defect recall above 95% at the review rate and Findings show location and measurements.

**Why it is hard.** The obvious approach is model labels from earlier runs, and it fails because errors would be copied. The second trap is in "Cost": the real signal is missed severe defects cost most, while teams usually reach for equal weights.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.9K a month. A mistake is expensive in the way inspection time measures it.

**What success looks like.** Offline: Defect recall by severity, Measurement error and Calibration. Online: Defects found before failure, Inspection time and Missed severe defects. The launch is judged on "Defects found before failure" while "Inspection time" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect cracks, spalling, corrosion and leaks in images of bridges, tunnels and pipes and rank defects by severity for inspection engineers to confirm and schedule.

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

- Inspector confirms every defect before work orders
- Defect recall above 95% at the review rate
- Findings show location and measurements
- Processing of 2M images per year
- Calibrated severity

## The approach in one paragraph

Start with manual visual inspection with notes and photographs, because it is the standard practice. Then earn the move to a detection and measurement pipeline that maps defects to structure elements, compares with past inspections and queues severe findings for inspector review, and only if it beats the baseline on Defect recall by severity and Measurement error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Defect class and extent | Crack width and area. Core. Guard against: from a vision model. |
| Add Location on the structure | Element and position. Context. Guard against: from registration. |
| Add Previous inspection findings | Past condition. Progression. Guard against: from records. |
| Run it as one pipeline | Image capture (crawlers, drones and cameras), Quality check (rules), Defect detection and measurement (vision model), Element mapping (registration), Progression analysis (comparison) and Work order (asset management), with Inspector review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle dirt and stains | Hard negative training. |

**Deliberately not doing**

- Inspector name: personal data.
- Camera brand: weak link.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Defect recall by severity, Measurement error and Calibration using time-ordered splits, then online on "Defects found before failure" with "Inspection time" as the guardrail. Watch for: Model labels as truth, Equal error costs and Automatic work orders.

## Baseline and production design

- **Baseline (build this first):** Manual visual inspection with notes and photographs, because it is the standard practice.
- **Production design:** A detection and measurement pipeline that maps defects to structure elements, compares with past inspections and queues severe findings for inspector review.

## Why AI, and why this kind

**Why AI.** Detect cracks, spalling, corrosion and leaks in images of bridges, tunnels and pipes and rank defects by severity for inspection engineers to confirm and schedule. The evidence that separates good from bad outcomes (Defect class and extent, Location on the structure, Previous inspection findings) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model labels from earlier runs" are what teams reach for first, and they fail because errors would be copied. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detection and measurement pipeline that maps defects to structure elements, compares with past inspections and queues severe findings for inspector review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Defect class and extent, Location on the structure, Previous inspection findings and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual visual inspection with notes and photographs, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detection and measurement pipeline that maps defects to structure elements, compares with past inspections and queues severe findings for inspector review | chosen | Meets the run-window envelope at $0.071 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Defects found before failure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model labels as truth.
- Evaluation trap: Equal error costs.
- Dirt and stains: marks look like cracks.
- Hidden defects: defects are behind coatings.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
