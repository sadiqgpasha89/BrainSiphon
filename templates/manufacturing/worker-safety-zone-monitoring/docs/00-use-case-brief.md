# Worker Safety Zone Monitoring: use-case brief

> Generated from the blueprint `manufacturing/worker-safety-zone-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Worker Safety Zone Monitoring · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect people entering hazardous zones near machines and vehicles and trigger warnings or a safe slow-down through the certified safety system, without identifying individuals. The system has to run in under 100 milliseconds, inside these limits: The certified safety controller remains the safety function and the model is an additional layer, Detection within 60 ms and No face recognition and no individual tracking over time.

**Why it is hard.** The obvious approach is the primary safety function, and it fails because an unvalidated model cannot be the guard. The second trap is in "Privacy": the real signal is anonymised person detection by zone, while teams usually reach for identified workers.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $460.2K a month. A mistake is expensive in the way zone violations measures it.

**What success looks like.** Offline: Recall of people in the zone at fixed false alarms, Latency and Camera health uptime. Online: Near misses, Zone violations and False warning rate. The launch is judged on "Near misses" while "Zone violations" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect people entering hazardous zones near machines and vehicles and trigger warnings or a safe slow-down through the certified safety system, without identifying individuals.

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

- The certified safety controller remains the safety function and the model is an additional layer
- Detection within 60 ms
- No face recognition and no individual tracking over time
- Works-council approved
- Warnings reach the worker and the supervisor

## The approach in one paragraph

Start with light curtains and area scanners wired to the safety controller, because they are the certified measure. Then earn the move to a person-detection model on edge hardware that raises warnings and feeds zone status to the safety system as an advisory input, with anonymised statistics for near-miss analysis, and only if it beats the baseline on Recall of people in the zone at fixed false alarms and Latency after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Person detection in zone | Whether a person-shaped object is inside the zone. Core trigger. Guard against: confidence calibrated. |
| Add Object speed and direction | Movement of vehicles and machine parts. Collision risk. Guard against: from tracking. |
| Add Zone state | The machine state and the allowed zone. Context. Guard against: from the controller. |
| Run it as one pipeline | Camera capture (industrial camera), Person detection (vision model on edge), Zone logic (rules), Warning output (beacons and HMI), Advisory signal (safety PLC interface) and Near-miss statistics (anonymised analytics), with Review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle poor lighting | Illumination checks and a fallback to certified sensors. |

**Deliberately not doing**

- Worker identity: privacy risk and no safety value.
- Clothing colour alone: weak link.
- Shift label alone: irrelevant.

**How the approach is proven**

Prove it offline on Recall of people in the zone at fixed false alarms, Latency and Camera health uptime using time-ordered splits, then online on "Near misses" with "Zone violations" as the guardrail. Watch for: Replacing certified interlocks, Identifying individuals and Accuracy as the headline metric.

## Baseline and production design

- **Baseline (build this first):** Light curtains and area scanners wired to the safety controller, because they are the certified measure.
- **Production design:** A person-detection model on edge hardware that raises warnings and feeds zone status to the safety system as an advisory input, with anonymised statistics for near-miss analysis.

## Why AI, and why this kind

**Why AI.** Detect people entering hazardous zones near machines and vehicles and trigger warnings or a safe slow-down through the certified safety system, without identifying individuals. The evidence that separates good from bad outcomes (Person detection in zone, Object speed and direction, Zone state) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the primary safety function" are what teams reach for first, and they fail because an unvalidated model cannot be the guard. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A person-detection model on edge hardware that raises warnings and feeds zone status to the safety system as an advisory input, with anonymised statistics for near-miss analysis.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Person detection in zone, Object speed and direction, Zone state and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Light curtains and area scanners wired to the safety controller, because they are the certified measure | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A person-detection model on edge hardware that raises warnings and feeds zone status to the safety system as an advisory input, with anonymised statistics for near-miss analysis | chosen | Meets the 80 ms envelope at $0.170 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Near misses) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replacing certified interlocks.
- Evaluation trap: Identifying individuals.
- Poor lighting: people are missed in the dark.
- Forklift loads: tall loads look like people.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
