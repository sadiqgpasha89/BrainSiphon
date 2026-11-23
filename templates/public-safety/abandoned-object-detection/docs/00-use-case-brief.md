# Abandoned Object Detection in Transit Stations: use-case brief

> Generated from the blueprint `public-safety/abandoned-object-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Abandoned Object Detection in Transit Stations · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect bags or objects left unattended in stations and alert operations staff to check them, without tracking or identifying the people who left them. The system has to run interactively, within a few seconds, inside these limits: Alert within 30 s of the object being static for the set time, Staff verify on site and Anonymised detection only.

**Why it is hard.** The obvious approach is any static object, and it fails because benches and bins create false alarms. The second trap is in "Privacy": the real signal is no person tracking for identity, while teams usually reach for following people through stations.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $197.2K a month. A mistake is expensive in the way staff time on false alarms measures it.

**What success looks like.** Offline: Detection of staged objects, False alarms per camera-day and Time to alert. Online: Objects verified, Staff time on false alarms and Response time. The launch is judged on "Objects verified" while "Staff time on false alarms" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect bags or objects left unattended in stations and alert operations staff to check them, without tracking or identifying the people who left them.

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

- Alert within 30 s of the object being static for the set time
- Staff verify on site
- Anonymised detection only
- False alarms under 1 per camera per day
- 3K cameras

## The approach in one paragraph

Start with staff patrols and passenger reports, because they are the standard process. Then earn the move to a detector with owner proximity and dwell rules, an alert queue with image clips and a feedback channel to reduce false alarms from fixed items, and only if it beats the baseline on Detection of staged objects and False alarms per camera-day after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Static object detection | Objects not moving. Core signal. Guard against: from vision. |
| Add Owner proximity | Whether people stay near the object. Abandonment. Guard against: from anonymised tracks. |
| Add Dwell time | Time static. Rule. Guard against: computed. |
| Run it as one pipeline | Camera capture (station cameras), Object detection (edge vision model), Owner proximity logic (anonymised tracker), Dwell rule (rules) and Staff check (mobile app), with Alert queue and Review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rush hour | Crowd-aware dwell times. |

**Deliberately not doing**

- Staff name: irrelevant.
- Camera model: an artefact.
- Clothing colour: irrelevant.

**How the approach is proven**

Prove it offline on Detection of staged objects, False alarms per camera-day and Time to alert using time-ordered splits, then online on "Objects verified" with "Staff time on false alarms" as the guardrail. Watch for: Tracking people, Static object alerts with no owner logic and Automatic closure.

## Baseline and production design

- **Baseline (build this first):** Staff patrols and passenger reports, because they are the standard process.
- **Production design:** A detector with owner proximity and dwell rules, an alert queue with image clips and a feedback channel to reduce false alarms from fixed items.

## Why AI, and why this kind

**Why AI.** Detect bags or objects left unattended in stations and alert operations staff to check them, without tracking or identifying the people who left them. The evidence that separates good from bad outcomes (Static object detection, Owner proximity, Dwell time) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any static object" are what teams reach for first, and they fail because benches and bins create false alarms. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detector with owner proximity and dwell rules, an alert queue with image clips and a feedback channel to reduce false alarms from fixed items.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Static object detection, Owner proximity, Dwell time and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Staff patrols and passenger reports, because they are the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detector with owner proximity and dwell rules, an alert queue with image clips and a feedback channel to reduce false alarms from fixed items | chosen | Meets the 2500 ms envelope at $0.219 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Objects verified) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Tracking people.
- Evaluation trap: Static object alerts with no owner logic.
- Rush hour: crowds hide owners.
- Cleaning carts: equipment looks abandoned.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
