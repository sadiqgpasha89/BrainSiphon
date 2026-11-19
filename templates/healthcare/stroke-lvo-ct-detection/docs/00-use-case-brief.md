# Stroke Large-Vessel Occlusion CT Detection: use-case brief

> Generated from the blueprint `healthcare/stroke-lvo-ct-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Stroke Large-Vessel Occlusion CT Detection · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect large vessel occlusions on CT angiography within minutes and notify stroke teams in parallel to speed thrombectomy. The system has to run interactively, within a few seconds, inside these limits: Door-to-notification under 5 minutes, Sensitivity above 90% and Mobile alert integration.

**Why it is hard.** The obvious approach is offline accuracy, and it fails because minutes matter more than marginal AUC. The second trap is in "Workflow": the real signal is parallel notification to specialists, while teams usually reach for replacing radiologist.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $53.5K a month. A mistake is expensive in the way thrombectomy rate measures it.

**What success looks like.** Offline: Sensitivity and specificity for LVO and Time to alert. Online: Door-to-puncture time and Thrombectomy rate. The launch is judged on "Door-to-puncture time" while "Thrombectomy rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect large vessel occlusions on CT angiography within minutes and notify stroke teams in parallel to speed thrombectomy.

**Training objective.** `\mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathcal{L}_{\text{seg}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{seg}} | Segmentation loss: how well the region of interest is outlined pixel by pixel. |

**Hard constraints**

- Door-to-notification under 5 minutes
- Sensitivity above 90%
- Mobile alert integration
- 24/7 reliability

## The approach in one paragraph

Start with radiologist read with phone call. Then earn the move to 3D CNN for LVO detection on CTA with automated vessel tracking, push alerts to stroke teams and confirmation by radiologist, and only if it beats the baseline on Sensitivity and specificity for LVO and Time to alert after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Vessel density asymmetry | Hyperdense vessel features. LVO cue. Guard against: registration quality. |
| Add Collateral score | Vessel filling in CTA phases. Prognosis. Guard against: phase timing. |
| Add Clot burden estimate | Occlusion extent. Triage. Guard against: annotation. |
| Run it as one pipeline | CT acquisition (scanner), DICOM routing (gateway), Preprocessing (registration), LVO detector (3D CNN on GPU), Notification service (mobile alerts), Radiologist and neurologist (human) and Outcome registry (stroke database). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle motion artefacts | Quality checks and uncertainty flags. |

**Deliberately not doing**

- Patient position: variable.
- Scanner site: domain.

**How the approach is proven**

Prove it offline on Sensitivity and specificity for LVO and Time to alert using time-ordered splits, then online on "Door-to-puncture time" with "Thrombectomy rate" as the guardrail. Watch for: Retrospective cohorts with selected cases and Latency measured without network delays.

## Baseline and production design

- **Baseline (build this first):** Radiologist read with phone call.
- **Production design:** 3D CNN for LVO detection on CTA with automated vessel tracking, push alerts to stroke teams and confirmation by radiologist.

## Why AI, and why this kind

**Why AI.** Detect large vessel occlusions on CT angiography within minutes and notify stroke teams in parallel to speed thrombectomy. The evidence that separates good from bad outcomes (Vessel density asymmetry, Collateral score, Clot burden estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "offline accuracy" are what teams reach for first, and they fail because minutes matter more than marginal AUC. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: 3D CNN for LVO detection on CTA with automated vessel tracking, push alerts to stroke teams and confirmation by radiologist.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Vessel density asymmetry, Collateral score, Clot burden estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Radiologist read with phone call | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| 3D CNN for LVO detection on CTA with automated vessel tracking, push alerts to stroke teams and confirmation by radiologist | chosen | Meets the 2500 ms envelope at $59.40 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Door-to-puncture time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Retrospective cohorts with selected cases.
- Evaluation trap: Latency measured without network delays.
- Motion artefacts: missed LVO or false alert.
- Network outage: alerts are delayed or lost when the network link between scanner and cloud fails.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
