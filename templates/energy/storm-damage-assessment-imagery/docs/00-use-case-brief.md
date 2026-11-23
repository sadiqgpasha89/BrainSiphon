# Storm Damage Assessment from Imagery: use-case brief

> Generated from the blueprint `energy/storm-damage-assessment-imagery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Storm Damage Assessment from Imagery · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assess damage to poles, lines and substations after storms from aerial, drone and satellite images so crews and materials are sent to the right places quickly. The system has to run as a scheduled batch job, inside these limits: Damage counts by area within 12 hours of imagery, Safety hazards such as downed lines flagged for immediate human review and Crew verifies before work.

**Why it is hard.** The obvious approach is image tags, and it fails because tags can miss hidden damage. The second trap is in "Priority": the real signal is hazard first then customers affected, while teams usually reach for damage count.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 347 at peak, at an estimated $197.7K a month. A mistake is expensive in the way restoration time measures it.

**What success looks like.** Offline: Hazard recall, Damage count error and Materials estimate error. Online: Assessment time, Restoration time and Crew miles driven. The launch is judged on "Assessment time" while "Restoration time" must not get worse.

## Objective, loss and constraints

**Business objective.** Assess damage to poles, lines and substations after storms from aerial, drone and satellite images so crews and materials are sent to the right places quickly.

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

- Damage counts by area within 12 hours of imagery
- Safety hazards such as downed lines flagged for immediate human review
- Crew verifies before work
- Images retained with model version
- 1M images per event

## The approach in one paragraph

Start with damage assessment by crews driving the lines, because it is the standard approach. Then earn the move to a damage detector on aerial and satellite images with hazard flags, a materials estimate and a crew verification step feeding restoration planning, and only if it beats the baseline on Hazard recall and Damage count error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Damage class scores | Model scores for poles, wires and equipment. Core signal. Guard against: calibrated. |
| Add Location and customers affected | Where damage sits and who is without power. Priority. Guard against: from GIS and OMS. |
| Add Image quality and coverage | Resolution and cloud cover. Reliability. Guard against: from metadata. |
| Run it as one pipeline | Imagery intake (aircraft, drones and satellites), Damage detection (vision model), Hazard flag (rules), Materials estimate (planning rules), Grid crew verification (field app) and Restoration planning (ADMS and work management), with Review after the event off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle cloud cover | Drone and aircraft fallbacks. |

**Deliberately not doing**

- Pilot name: irrelevant.
- Image file name: an artefact.
- Flight id: an identifier.

**How the approach is proven**

Prove it offline on Hazard recall, Damage count error and Materials estimate error using time-ordered splits, then online on "Assessment time" with "Restoration time" as the guardrail. Watch for: Using damage counts as priority, Image tags as truth and No hazard escalation.

## Baseline and production design

- **Baseline (build this first):** Damage assessment by crews driving the lines, because it is the standard approach.
- **Production design:** A damage detector on aerial and satellite images with hazard flags, a materials estimate and a crew verification step feeding restoration planning.

## Why AI, and why this kind

**Why AI.** Assess damage to poles, lines and substations after storms from aerial, drone and satellite images so crews and materials are sent to the right places quickly. The evidence that separates good from bad outcomes (Damage class scores, Location and customers affected, Image quality and coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "image tags" are what teams reach for first, and they fail because tags can miss hidden damage. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A damage detector on aerial and satellite images with hazard flags, a materials estimate and a crew verification step feeding restoration planning.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Damage class scores, Location and customers affected, Image quality and coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Damage assessment by crews driving the lines, because it is the standard approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A damage detector on aerial and satellite images with hazard flags, a materials estimate and a crew verification step feeding restoration planning | chosen | Meets the run-window envelope at $0.220 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Assessment time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using damage counts as priority.
- Evaluation trap: Image tags as truth.
- Cloud cover: satellite images are blocked.
- Debris confusion: debris looks like damaged equipment.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
