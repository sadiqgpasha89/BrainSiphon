# Quantity Takeoff from Drawings and Models: use-case brief

> Generated from the blueprint `engineering/quantity-takeoff-from-drawings` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Quantity Takeoff from Drawings and Models · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Measure quantities such as areas, lengths and counts from models and drawings and compare them with estimates, with estimators confirming the results. The system has to run as a scheduled batch job, inside these limits: Quantities link to model elements or drawing regions, Estimators confirm before use in a bid and Differences against the estimate flagged.

**Why it is hard.** The obvious approach is image measurements first, and it fails because models are exact when they are complete. The second trap is in "Check": the real signal is compare with the estimate and past projects, while teams usually reach for trust the first result.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.9K a month. A mistake is expensive in the way estimate corrections measures it.

**What success looks like.** Offline: Quantity error against audited takeoffs, Mapping accuracy and Scale error detection. Online: Takeoff time, Estimate corrections and Bid errors. The launch is judged on "Takeoff time" while "Estimate corrections" must not get worse.

## Objective, loss and constraints

**Business objective.** Measure quantities such as areas, lengths and counts from models and drawings and compare them with estimates, with estimators confirming the results.

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

- Quantities link to model elements or drawing regions
- Estimators confirm before use in a bid
- Differences against the estimate flagged
- Takeoff of 5,000 sheets per project
- Units and scales checked

## The approach in one paragraph

Start with manual measurement on screen by estimators, because it is the current practice. Then earn the move to a takeoff pipeline that reads model quantities or measures drawings with scale checks, maps to cost items and flags gaps to ratios for estimator review, and only if it beats the baseline on Quantity error against audited takeoffs and Mapping accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Element quantities | Areas, volumes and counts. Core. Guard against: from the model. |
| Add Drawing scale and units | Scale bar and units. Check. Guard against: from the drawing. |
| Add Assembly definitions | Materials per element. Mapping. Guard against: from the cost database. |
| Run it as one pipeline | Model and drawing intake (document system), Element extraction (BIM and vision), Scale and unit check (rules), Cost item mapping (cost database), Ratio sanity check (analytics) and Quantity export (bid system), with Estimator review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle incomplete model | Drawing-based fallback and gap report. |

**Deliberately not doing**

- Estimator name: personal data.
- Sheet number: an identifier.
- Drawing style: an artefact.

**How the approach is proven**

Prove it offline on Quantity error against audited takeoffs, Mapping accuracy and Scale error detection using time-ordered splits, then online on "Takeoff time" with "Estimate corrections" as the guardrail. Watch for: Unchecked scale, Automatic pricing and Image-only measurement.

## Baseline and production design

- **Baseline (build this first):** Manual measurement on screen by estimators, because it is the current practice.
- **Production design:** A takeoff pipeline that reads model quantities or measures drawings with scale checks, maps to cost items and flags gaps to ratios for estimator review.

## Why AI, and why this kind

**Why AI.** Measure quantities such as areas, lengths and counts from models and drawings and compare them with estimates, with estimators confirming the results. The evidence that separates good from bad outcomes (Element quantities, Drawing scale and units, Assembly definitions) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "image measurements first" are what teams reach for first, and they fail because models are exact when they are complete. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A takeoff pipeline that reads model quantities or measures drawings with scale checks, maps to cost items and flags gaps to ratios for estimator review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Element quantities, Drawing scale and units, Assembly definitions and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual measurement on screen by estimators, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A takeoff pipeline that reads model quantities or measures drawings with scale checks, maps to cost items and flags gaps to ratios for estimator review | chosen | Meets the run-window envelope at $0.071 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Takeoff time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Unchecked scale.
- Evaluation trap: Automatic pricing.
- Incomplete model: elements are missing.
- Revisions: quantities change between issues.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
