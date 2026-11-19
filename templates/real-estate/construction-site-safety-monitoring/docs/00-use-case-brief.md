# Construction Site Safety Monitoring: use-case brief

> Generated from the blueprint `real-estate/construction-site-safety-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Construction Site Safety Monitoring · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors. The system has to run interactively, within a few seconds, inside these limits: Alerts reach the supervisor within 5 seconds of a hazard, Individual workers are not scored or ranked and Faces blurred and footage retained only for incidents.

**Why it is hard.** The obvious approach is detecting people on site, and it fails because people are always present on a site, so presence is not a hazard. The second trap is in "Privacy": the real signal is aggregate counts and blurred images, while teams usually reach for identifying individuals.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $32.4K a month. A mistake is expensive in the way near misses measures it.

**What success looks like.** Offline: Recall of hazards and Precision. Online: Incidents and Near misses. The launch is judged on "Incidents" while "Near misses" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{FL}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{det}} | Detection loss: how well objects are found and their boxes placed. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- Alerts reach the supervisor within 5 seconds of a hazard
- Individual workers are not scored or ranked
- Faces blurred and footage retained only for incidents
- Compliance with union agreements and local legal rules

## The approach in one paragraph

Start with periodic manual inspections, because they are required. Then earn the move to detection and tracking with zone logic, persistence rules and supervisor alerts, and only if it beats the baseline on Recall of hazards and Precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around PPE detection | Probability that a detected person wears a helmet and a high-visibility vest. The most common safety rule. Guard against: occlusion by machinery lowers accuracy, so require confidence over frames. |
| Add Zone entry | Whether a person's position falls inside a polygon for an exclusion zone. A direct hazard definition. Guard against: camera calibration errors move the polygon, so recalibrate often. |
| Add Equipment proximity | Estimated distance between a person and moving plant. Struck-by incidents are a leading cause of harm. Guard against: depth from a single camera is imprecise. |
| Run it as one pipeline | Cameras (RTSP), Edge detector (GPU), Tracker (model), Rules (zones), Alert (push) and Supervisor app (mobile), with Review log off the critical path. |
| Optimise the right thing | The objective weighs detection loss: how well objects are found and their boxes placed, so the model is trained on the cost of the decision and not on a generic score. |
| Handle night | Use infrared cameras or restrict automated alerts to well-lit areas. |

**Deliberately not doing**

- Camera brand: A hardware attribute that has no effect on hazard.
- Worker identity: Personal and not allowed, and the model should not use it.
- Time stamp: Hazards occur at any time, so the clock adds no information.

**How the approach is proven**

Prove it offline on Recall of hazards and Precision using time-ordered splits, then online on "Incidents" with "Near misses" as the guardrail. Watch for: Staged footage is clean and well lit and overstates accuracy on real, cluttered sites and Site differences in layout, PPE and weather mean a test on one site overstates performance elsewhere.

## Baseline and production design

- **Baseline (build this first):** Periodic manual inspections, because they are required.
- **Production design:** Detection and tracking with zone logic, persistence rules and supervisor alerts.

## Why AI, and why this kind

**Why AI.** Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors. The evidence that separates good from bad outcomes (PPE detection, Zone entry, Equipment proximity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "detecting people on site" are what teams reach for first, and they fail because people are always present on a site, so presence is not a hazard. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Detection and tracking with zone logic, persistence rules and supervisor alerts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among PPE detection, Zone entry, Equipment proximity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic manual inspections, because they are required | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Detection and tracking with zone logic, persistence rules and supervisor alerts | chosen | Meets the 2500 ms envelope at $0.360 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Staged footage is clean and well lit and overstates accuracy on real, cluttered sites.
- Evaluation trap: Site differences in layout, PPE and weather mean a test on one site overstates performance elsewhere.
- Night: low light at night makes detection unreliable.
- Dust: dust and dirt on lenses hide people and equipment.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
