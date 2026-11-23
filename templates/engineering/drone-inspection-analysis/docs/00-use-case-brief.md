# Drone Inspection Analysis: use-case brief

> Generated from the blueprint `engineering/drone-inspection-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Drone Inspection Analysis · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Analyse drone images of roofs, towers, stockpiles and facades to detect damage and measure change over time, for inspectors to confirm and plan repairs. The system has to run as a scheduled batch job, inside these limits: Findings link to image and location, Inspector confirms before repair orders and Flights follow airspace and privacy rules.

**Why it is hard.** The obvious approach is model findings from earlier runs, and it fails because errors can be copied forward. The second trap is in "Compare": the real signal is same-angle repeat captures, while teams usually reach for different angles.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.9K a month. A mistake is expensive in the way defects found before failure measures it.

**What success looks like.** Offline: Defect recall and precision, Measurement error and Registration error. Online: Time to inspect, Defects found before failure and Inspection risk to people. The launch is judged on "Time to inspect" while "Defects found before failure" must not get worse.

## Objective, loss and constraints

**Business objective.** Analyse drone images of roofs, towers, stockpiles and facades to detect damage and measure change over time, for inspectors to confirm and plan repairs.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Findings link to image and location
- Inspector confirms before repair orders
- Flights follow airspace and privacy rules
- Change detection with 2 cm resolution
- 5K assets per year

## The approach in one paragraph

Start with inspectors climbing or using binoculars and cameras, because it is the standard method. Then earn the move to a pipeline that plans repeatable flights, detects and measures defects, aligns images across visits and gives inspectors a ranked list with images, and only if it beats the baseline on Defect recall and precision and Measurement error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Defect candidates | Cracks, corrosion and loose items. Core. Guard against: from a vision model. |
| Add Pose and registration | Position of images over time. Alignment. Guard against: from survey data. |
| Add Measurement scale | Resolution and scale. Size. Guard against: from metadata. |
| Run it as one pipeline | Flight plan (drone software), Image capture (drone), Registration and mosaicking (photogrammetry), Defect detection (vision model), Change detection (comparison) and Repair task (maintenance system), with Inspector review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle glare | Capture time rules. |

**Deliberately not doing**

- Pilot name: personal data.
- Drone model: weak link.
- Weather label: weak link.

**How the approach is proven**

Prove it offline on Defect recall and precision, Measurement error and Registration error using time-ordered splits, then online on "Time to inspect" with "Defects found before failure" as the guardrail. Watch for: Model findings as labels, Mixed-angle comparison and Unrestricted capture.

## Baseline and production design

- **Baseline (build this first):** Inspectors climbing or using binoculars and cameras, because it is the standard method.
- **Production design:** A pipeline that plans repeatable flights, detects and measures defects, aligns images across visits and gives inspectors a ranked list with images.

## Why AI, and why this kind

**Why AI.** Analyse drone images of roofs, towers, stockpiles and facades to detect damage and measure change over time, for inspectors to confirm and plan repairs. The evidence that separates good from bad outcomes (Defect candidates, Pose and registration, Measurement scale) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model findings from earlier runs" are what teams reach for first, and they fail because errors can be copied forward. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A pipeline that plans repeatable flights, detects and measures defects, aligns images across visits and gives inspectors a ranked list with images.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Defect candidates, Pose and registration, Measurement scale and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Inspectors climbing or using binoculars and cameras, because it is the standard method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A pipeline that plans repeatable flights, detects and measures defects, aligns images across visits and gives inspectors a ranked list with images | chosen | Meets the run-window envelope at $0.071 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to inspect) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model findings as labels.
- Evaluation trap: Mixed-angle comparison.
- Glare: sun reflections hide defects.
- Obstacles: trees block the view.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
