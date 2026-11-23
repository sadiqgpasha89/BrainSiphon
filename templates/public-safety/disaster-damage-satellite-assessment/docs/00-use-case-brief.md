# Disaster Damage Assessment from Satellite Imagery: use-case brief

> Generated from the blueprint `public-safety/disaster-damage-satellite-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Disaster Damage Assessment from Satellite Imagery · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Map damaged buildings, roads and flooding from satellite and aerial images after disasters so responders prioritise rescue and supplies. The system has to run as a scheduled batch job, inside these limits: Damage maps within 12 hours of imagery, Hazards flagged for immediate human review and Field teams verify.

**Why it is hard.** The obvious approach is image tags, and it fails because roofs can look fine when buildings are unsafe. The second trap is in "Priority": the real signal is hazard and people at risk first, while teams usually reach for damage counts.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 347 at peak, at an estimated $197.7K a month. A mistake is expensive in the way rescue tasks prioritised measures it.

**What success looks like.** Offline: Damage class accuracy, Recall of severe damage and Coverage parity. Online: Time to a damage map, Rescue tasks prioritised and Resources sent to the right areas. The launch is judged on "Time to a damage map" while "Rescue tasks prioritised" must not get worse.

## Objective, loss and constraints

**Business objective.** Map damaged buildings, roads and flooding from satellite and aerial images after disasters so responders prioritise rescue and supplies.

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

- Damage maps within 12 hours of imagery
- Hazards flagged for immediate human review
- Field teams verify
- Building-level results with uncertainty
- 1M buildings per event

## The approach in one paragraph

Start with ground surveys and aerial reconnaissance reports, because they are the current methods. Then earn the move to a damage classification pipeline for buildings and roads with calibrated scores, a priority map weighted by exposure and a verification process with field teams, and only if it beats the baseline on Damage class accuracy and Recall of severe damage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Damage class scores | Model scores per building. Core signal. Guard against: calibrated. |
| Add Flood extent | Water detected in images. Hazard. Guard against: from radar and optical. |
| Add Access and road status | Blocked roads. Logistics. Guard against: from imagery. |
| Run it as one pipeline | Imagery intake (satellite and aircraft providers), Co-registration (imagery processing), Incident damage detection (vision model), Priority weighting (rules), Field verification (rapid assessment teams) and Map publication (incident command), with Accuracy review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle cloud cover | Radar and aircraft fallbacks. |

**Deliberately not doing**

- Image vendor: irrelevant.
- Tile name: an identifier.
- Analyst name: irrelevant.

**How the approach is proven**

Prove it offline on Damage class accuracy, Recall of severe damage and Coverage parity using time-ordered splits, then online on "Time to a damage map" with "Rescue tasks prioritised" as the guardrail. Watch for: Counts as priority, Image tags as truth and Hidden coverage gaps.

## Baseline and production design

- **Baseline (build this first):** Ground surveys and aerial reconnaissance reports, because they are the current methods.
- **Production design:** A damage classification pipeline for buildings and roads with calibrated scores, a priority map weighted by exposure and a verification process with field teams.

## Why AI, and why this kind

**Why AI.** Map damaged buildings, roads and flooding from satellite and aerial images after disasters so responders prioritise rescue and supplies. The evidence that separates good from bad outcomes (Damage class scores, Flood extent, Access and road status) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "image tags" are what teams reach for first, and they fail because roofs can look fine when buildings are unsafe. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A damage classification pipeline for buildings and roads with calibrated scores, a priority map weighted by exposure and a verification process with field teams.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Damage class scores, Flood extent, Access and road status and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Ground surveys and aerial reconnaissance reports, because they are the current methods | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A damage classification pipeline for buildings and roads with calibrated scores, a priority map weighted by exposure and a verification process with field teams | chosen | Meets the run-window envelope at $0.220 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to a damage map) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counts as priority.
- Evaluation trap: Image tags as truth.
- Cloud cover: the area cannot be seen.
- Debris confusion: rubble looks like intact buildings.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
