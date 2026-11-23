# Perimeter Intrusion Detection: use-case brief

> Generated from the blueprint `public-safety/perimeter-intrusion-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Perimeter Intrusion Detection · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect people or vehicles crossing fences and restricted lines at facilities from cameras and sensors and alert the security desk with a short clip, without identifying people. The system has to run in under 100 milliseconds, inside these limits: Alert within 3 s with a clip, A security officer verifies before response and No facial recognition.

**Why it is hard.** The obvious approach is raw motion events, and it fails because motion triggers fire on animals and weather. The second trap is in "Privacy": the real signal is detection of presence and behaviour only, while teams usually reach for identity.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $391.0K a month. A mistake is expensive in the way guard time on false alarms measures it.

**What success looks like.** Offline: Intrusion recall in trials, False alarms per camera-week and Alert latency. Online: Verified intrusions, Guard time on false alarms and Response time. The launch is judged on "Verified intrusions" while "Guard time on false alarms" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect people or vehicles crossing fences and restricted lines at facilities from cameras and sensors and alert the security desk with a short clip, without identifying people.

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

- Alert within 3 s with a clip
- A security officer verifies before response
- No facial recognition
- False alarms under 3 per camera per week
- 2K cameras

## The approach in one paragraph

Start with motion detection and fence sensors with a guard checking each alarm, because it is the current setup. Then earn the move to a detector with line-crossing rules, sensor corroboration and a clip view for guards, plus tuning from feedback on false alarms, and only if it beats the baseline on Intrusion recall in trials and False alarms per camera-week after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Object class and crossing | Person or vehicle crossing a line. Core signal. Guard against: from the vision model. |
| Add Fence and sensor events | Vibration or fibre sensor alarms. Corroboration. Guard against: from sensors. |
| Add Weather and lighting | Rain, wind and darkness. Reliability. Guard against: from sensors. |
| Run it as one pipeline | Camera and sensor capture (site systems), Object detection (edge vision model), Crossing logic (rules), Sensor corroboration (event fusion), Alert with clip (security console) and Officer verification (security desk), with Feedback and retraining off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle wildlife | Object classes and size filters. |

**Deliberately not doing**

- Officer name: irrelevant.
- Camera model: an artefact.
- Image file name: an artefact.

**How the approach is proven**

Prove it offline on Intrusion recall in trials, False alarms per camera-week and Alert latency using time-ordered splits, then online on "Verified intrusions" with "Guard time on false alarms" as the guardrail. Watch for: Facial recognition, Automatic lockdown and Motion events as labels.

## Baseline and production design

- **Baseline (build this first):** Motion detection and fence sensors with a guard checking each alarm, because it is the current setup.
- **Production design:** A detector with line-crossing rules, sensor corroboration and a clip view for guards, plus tuning from feedback on false alarms.

## Why AI, and why this kind

**Why AI.** Detect people or vehicles crossing fences and restricted lines at facilities from cameras and sensors and alert the security desk with a short clip, without identifying people. The evidence that separates good from bad outcomes (Object class and crossing, Fence and sensor events, Weather and lighting) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw motion events" are what teams reach for first, and they fail because motion triggers fire on animals and weather. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detector with line-crossing rules, sensor corroboration and a clip view for guards, plus tuning from feedback on false alarms.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Object class and crossing, Fence and sensor events, Weather and lighting and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Motion detection and fence sensors with a guard checking each alarm, because it is the current setup | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detector with line-crossing rules, sensor corroboration and a clip view for guards, plus tuning from feedback on false alarms | chosen | Meets the 80 ms envelope at $0.217 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Verified intrusions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Facial recognition.
- Evaluation trap: Automatic lockdown.
- Wildlife: animals trigger alerts.
- Storm: wind and rain produce noise.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
