# Vegetation Encroachment Detection: use-case brief

> Generated from the blueprint `energy/vegetation-encroachment-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vegetation Encroachment Detection · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Measure vegetation clearance to power lines from aerial and satellite imagery and lidar and rank spans by risk of contact so trimming crews work where it matters. The system has to run as a scheduled batch job, inside these limits: Clearance estimates with an uncertainty, Priority by growth rate and local wind and fire risk and Arborist confirms before trimming.

**Why it is hard.** The obvious approach is image labels only, and it fails because images can mislead in depth. The second trap is in "Priority": the real signal is time to contact given growth, while teams usually reach for current distance only.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 1.0K at peak, at an estimated $474.3K a month. A mistake is expensive in the way trim cost per span measures it.

**What success looks like.** Offline: Clearance error against field measures, Recall of high-risk spans and Ranking accuracy. Online: Vegetation outages, Trim cost per span and Spans trimmed that did not need it. The launch is judged on "Vegetation outages" while "Trim cost per span" must not get worse.

## Objective, loss and constraints

**Business objective.** Measure vegetation clearance to power lines from aerial and satellite imagery and lidar and rank spans by risk of contact so trimming crews work where it matters.

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

- Clearance estimates with an uncertainty
- Priority by growth rate and local wind and fire risk
- Arborist confirms before trimming
- Annual coverage of 100K km of line

## The approach in one paragraph

Start with fixed trimming cycles by line class, because they are the regulatory and cost default. Then earn the move to a segmentation and distance model on lidar and imagery with growth models and a risk-ranked trim list, plus arborist verification and feedback, and only if it beats the baseline on Clearance error against field measures and Recall of high-risk spans after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Clearance distance | Distance from canopy to conductor. Core measurement. Guard against: from lidar or imagery. |
| Add Species and growth rate | Tree type and growth. Time to contact. Guard against: from classification. |
| Add Line sag and wind swing | Conductor movement under load and wind. Dynamic clearance. Guard against: from models. |
| Run it as one pipeline | Imagery and lidar intake (survey providers), Canopy and line segmentation (vision model), Clearance and growth estimate (geometric model), Risk ranking (rules), Trim work order (work management) and Outcome and regrowth tracking (annual), with Arborist review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle dense canopy | Multi-source checks and field samples. |

**Deliberately not doing**

- Survey vendor name: irrelevant.
- Image file name: an artefact.
- Crew name: irrelevant.

**How the approach is proven**

Prove it offline on Clearance error against field measures, Recall of high-risk spans and Ranking accuracy using time-ordered splits, then online on "Vegetation outages" with "Trim cost per span" as the guardrail. Watch for: Fixed cycles only, Using distance without growth and Image labels as truth.

## Baseline and production design

- **Baseline (build this first):** Fixed trimming cycles by line class, because they are the regulatory and cost default.
- **Production design:** A segmentation and distance model on lidar and imagery with growth models and a risk-ranked trim list, plus arborist verification and feedback.

## Why AI, and why this kind

**Why AI.** Measure vegetation clearance to power lines from aerial and satellite imagery and lidar and rank spans by risk of contact so trimming crews work where it matters. The evidence that separates good from bad outcomes (Clearance distance, Species and growth rate, Line sag and wind swing) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "image labels only" are what teams reach for first, and they fail because images can mislead in depth. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A segmentation and distance model on lidar and imagery with growth models and a risk-ranked trim list, plus arborist verification and feedback.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Clearance distance, Species and growth rate, Line sag and wind swing and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed trimming cycles by line class, because they are the regulatory and cost default | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A segmentation and distance model on lidar and imagery with growth models and a risk-ranked trim list, plus arborist verification and feedback | chosen | Meets the run-window envelope at $0.176 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Vegetation outages) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixed cycles only.
- Evaluation trap: Using distance without growth.
- Dense canopy: lidar misses the lower tree.
- Season change: leaf-off images underestimate.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
