# As-Built Deviation Detection: use-case brief

> Generated from the blueprint `engineering/as-built-deviation-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** As-Built Deviation Detection · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare laser scans and photos of completed work with the design model and flag deviations beyond tolerance for the site engineer to inspect. The system has to run as a scheduled batch job, inside these limits: Deviations shown with location and measured distance, Tolerance limits from the specification and Site engineer confirms.

**Why it is hard.** The obvious approach is visual alignment only, and it fails because misaligned scans create false deviations. The second trap is in "Threshold": the real signal is specification tolerances, while teams usually reach for one limit for all.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way rework cost measures it.

**What success looks like.** Offline: Deviation detection against surveys, Tolerance classification accuracy and Registration error. Online: Deviations found before handover, Rework cost and Inspection time. The launch is judged on "Deviations found before handover" while "Rework cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare laser scans and photos of completed work with the design model and flag deviations beyond tolerance for the site engineer to inspect.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Deviations shown with location and measured distance
- Tolerance limits from the specification
- Site engineer confirms
- Scan registration error under 5 mm
- 50 scans per week

## The approach in one paragraph

Start with manual spot measurements by surveyors, because they are the standard method. Then earn the move to a comparison pipeline that registers scans to the model, computes deviations by element tolerance and creates inspection tasks with images and distances, and only if it beats the baseline on Deviation detection against surveys and Tolerance classification accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Point-to-model distance | Scan deviation from the model. Core. Guard against: from registration. |
| Add Element type and tolerance class | What is being checked. Threshold. Guard against: from the model. |
| Add Registration quality | Residual error. Quality. Guard against: from the survey. |
| Run it as one pipeline | Scan capture (laser scanner), Registration to control points (survey software), Model comparison (geometry engine), Tolerance check (rules), Inspection task (site app), Engineer decision (site engineer) and Result record (document system). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle temporary works | Occlusion masks. |

**Deliberately not doing**

- Surveyor name: personal data.
- Scan file name: an artefact.
- Weather: weak link.

**How the approach is proven**

Prove it offline on Deviation detection against surveys, Tolerance classification accuracy and Registration error using time-ordered splits, then online on "Deviations found before handover" with "Rework cost" as the guardrail. Watch for: Visual alignment as truth, One tolerance for all and Automatic rework orders.

## Baseline and production design

- **Baseline (build this first):** Manual spot measurements by surveyors, because they are the standard method.
- **Production design:** A comparison pipeline that registers scans to the model, computes deviations by element tolerance and creates inspection tasks with images and distances.

## Why AI, and why this kind

**Why AI.** Compare laser scans and photos of completed work with the design model and flag deviations beyond tolerance for the site engineer to inspect. The evidence that separates good from bad outcomes (Point-to-model distance, Element type and tolerance class, Registration quality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "visual alignment only" are what teams reach for first, and they fail because misaligned scans create false deviations. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A comparison pipeline that registers scans to the model, computes deviations by element tolerance and creates inspection tasks with images and distances.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Point-to-model distance, Element type and tolerance class, Registration quality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual spot measurements by surveyors, because they are the standard method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A comparison pipeline that registers scans to the model, computes deviations by element tolerance and creates inspection tasks with images and distances | chosen | Meets the run-window envelope at $0.043 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Deviations found before handover) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Visual alignment as truth.
- Evaluation trap: One tolerance for all.
- Temporary works: objects block the view.
- Model out of date: design changed on site.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
