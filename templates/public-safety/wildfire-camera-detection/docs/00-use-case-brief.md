# Wildfire Smoke Detection from Cameras: use-case brief

> Generated from the blueprint `public-safety/wildfire-camera-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wildfire Smoke Detection from Cameras · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect early smoke plumes in tower camera feeds and alert fire dispatchers with the image evidence so crews arrive while fires are small. The system has to run interactively, within a few seconds, inside these limits: Alert with an image loop within 60 s of first visible smoke, A person confirms before dispatch and False alarms under 2 per camera per week.

**Why it is hard.** The obvious approach is cloud and fog images, and it fails because weather resembles smoke. The second trap is in "Action": the real signal is a human-verified alert, while teams usually reach for an automatic dispatch.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $279.7K a month. A mistake is expensive in the way detection time measures it.

**What success looks like.** Offline: Time to detection on known fires, False alarms per camera-week and Recall by distance. Online: Fire size at first attack, Detection time and Dispatcher false alarm workload. The launch is judged on "Fire size at first attack" while "Detection time" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect early smoke plumes in tower camera feeds and alert fire dispatchers with the image evidence so crews arrive while fires are small.

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

- Alert with an image loop within 60 s of first visible smoke
- A person confirms before dispatch
- False alarms under 2 per camera per week
- Works day and night
- 1K cameras

## The approach in one paragraph

Start with human lookouts, public reports and satellite hot spot alerts, because they are the current methods. Then earn the move to a smoke detection model on camera loops with temporal confirmation, a verification screen for dispatchers and a feedback loop that retrains on confirmed events and false alarms, and only if it beats the baseline on Time to detection on known fires and False alarms per camera-week after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Smoke probability by region | Model score on image regions. Core signal. Guard against: calibrated. |
| Add Plume growth over frames | Growth and drift of the plume. Confirms smoke. Guard against: from frame sequences. |
| Add Weather and fire danger | Wind, humidity and fire danger rating. Prior. Guard against: from weather. |
| Run it as one pipeline | Camera loop capture (tower cameras), Privacy masking (image processing), Smoke detection (vision model), Temporal confirmation (plume tracker), Dispatcher verification (alert console), Incident creation (CAD) and Retraining (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle fog and dust | Weather-aware models and time confirmation. |

**Deliberately not doing**

- Camera name: an identifier.
- Operator name: irrelevant.
- Image file name: an artefact.

**How the approach is proven**

Prove it offline on Time to detection on known fires, False alarms per camera-week and Recall by distance using time-ordered splits, then online on "Fire size at first attack" with "Detection time" as the guardrail. Watch for: Automatic dispatch, Weather confusion ignored and No privacy masks.

## Baseline and production design

- **Baseline (build this first):** Human lookouts, public reports and satellite hot spot alerts, because they are the current methods.
- **Production design:** A smoke detection model on camera loops with temporal confirmation, a verification screen for dispatchers and a feedback loop that retrains on confirmed events and false alarms.

## Why AI, and why this kind

**Why AI.** Detect early smoke plumes in tower camera feeds and alert fire dispatchers with the image evidence so crews arrive while fires are small. The evidence that separates good from bad outcomes (Smoke probability by region, Plume growth over frames, Weather and fire danger) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "cloud and fog images" are what teams reach for first, and they fail because weather resembles smoke. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A smoke detection model on camera loops with temporal confirmation, a verification screen for dispatchers and a feedback loop that retrains on confirmed events and false alarms.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Smoke probability by region, Plume growth over frames, Weather and fire danger and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Human lookouts, public reports and satellite hot spot alerts, because they are the current methods | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A smoke detection model on camera loops with temporal confirmation, a verification screen for dispatchers and a feedback loop that retrains on confirmed events and false alarms | chosen | Meets the 2500 ms envelope at $0.311 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fire size at first attack) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic dispatch.
- Evaluation trap: Weather confusion ignored.
- Fog and dust: the model sees false plumes.
- Night fires: smoke is not visible.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
