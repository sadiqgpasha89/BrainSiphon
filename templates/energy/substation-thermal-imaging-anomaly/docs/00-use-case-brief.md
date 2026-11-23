# Substation Thermal Imaging Anomaly Detection: use-case brief

> Generated from the blueprint `energy/substation-thermal-imaging-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Substation Thermal Imaging Anomaly Detection · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find hot spots on connectors, breakers and transformers in thermal images and fixed camera feeds, rank them by temperature rise and load, and schedule repairs. The system has to run as a scheduled batch job, inside these limits: Hot spot list with temperature rise relative to similar parts, Load-adjusted severity and Technician confirms before outage planning.

**Why it is hard.** The obvious approach is absolute temperature, and it fails because ambient and load change temperatures. The second trap is in "Severity": the real signal is rise adjusted for load, while teams usually reach for rise alone.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 347 at peak, at an estimated $41.7K a month. A mistake is expensive in the way unplanned outages measures it.

**What success looks like.** Offline: Recall of confirmed hot spots, False alarms per scan and Severity rank accuracy. Online: Failures from hot connections, Unplanned outages and Repair backlog by severity. The launch is judged on "Failures from hot connections" while "Unplanned outages" must not get worse.

## Objective, loss and constraints

**Business objective.** Find hot spots on connectors, breakers and transformers in thermal images and fixed camera feeds, rank them by temperature rise and load, and schedule repairs.

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

- Hot spot list with temperature rise relative to similar parts
- Load-adjusted severity
- Technician confirms before outage planning
- Weekly scan for 5K substations

## The approach in one paragraph

Start with a fixed temperature-rise threshold per component type, because standards define it. Then earn the move to a detector with load and ambient normalisation that compares similar phases and ranks hot spots by load-adjusted severity with a technician confirmation step, and only if it beats the baseline on Recall of confirmed hot spots and False alarms per scan after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Temperature difference between phases | Difference between similar parts. Anomaly. Guard against: from the image. |
| Add Load at capture time | Current at the time of the image. Normalisation. Guard against: from SCADA. |
| Add Ambient and wind | Outdoor temperature and wind speed. Correction. Guard against: from weather. |
| Run it as one pipeline | Thermal image capture (cameras and handheld scans), Component detection (vision model), Normalisation (load and weather join), Hot spot scoring (rules and model), Ranked repair list (work management), Technician confirmation (field app) and Outcome tracking (re-scan). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle reflection | Reflection filters and angle metadata. |

**Deliberately not doing**

- Camera model: an identifier.
- Operator name: irrelevant.
- Image file name: an artefact.

**How the approach is proven**

Prove it offline on Recall of confirmed hot spots, False alarms per scan and Severity rank accuracy using time-ordered splits, then online on "Failures from hot connections" with "Unplanned outages" as the guardrail. Watch for: Absolute temperature thresholds, Ignoring load at capture and Alerts with no ranking.

## Baseline and production design

- **Baseline (build this first):** A fixed temperature-rise threshold per component type, because standards define it.
- **Production design:** A detector with load and ambient normalisation that compares similar phases and ranks hot spots by load-adjusted severity with a technician confirmation step.

## Why AI, and why this kind

**Why AI.** Find hot spots on connectors, breakers and transformers in thermal images and fixed camera feeds, rank them by temperature rise and load, and schedule repairs. The evidence that separates good from bad outcomes (Temperature difference between phases, Load at capture time, Ambient and wind) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "absolute temperature" are what teams reach for first, and they fail because ambient and load change temperatures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detector with load and ambient normalisation that compares similar phases and ranks hot spots by load-adjusted severity with a technician confirmation step.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Temperature difference between phases, Load at capture time, Ambient and wind and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A fixed temperature-rise threshold per component type, because standards define it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detector with load and ambient normalisation that compares similar phases and ranks hot spots by load-adjusted severity with a technician confirmation step | chosen | Meets the run-window envelope at $0.046 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Failures from hot connections) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Absolute temperature thresholds.
- Evaluation trap: Ignoring load at capture.
- Reflection: sun glare causes a false hot spot.
- Low load scan: problems are hidden at low load.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
