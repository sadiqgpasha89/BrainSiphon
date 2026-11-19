# Ultrasound Guidance & Auto-Measurement: use-case brief

> Generated from the blueprint `healthcare/ultrasound-guidance-and-measurement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ultrasound Guidance & Auto-Measurement · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Provide real-time probe guidance and automatic measurements (fetal biometry, cardiac EF) so non-experts acquire diagnostic-quality scans. The system has to run in under 100 milliseconds, inside these limits: 30 fps on handheld devices, Operator-independent quality and Regulatory clearance.

**Why it is hard.** The obvious approach is post-hoc image analysis, and it fails because poor scans cannot be fixed after acquisition. The second trap is in "Measurement": the real signal is uncertainty with measurements, while teams usually reach for single-number outputs.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $427.5K a month. A mistake is expensive in the way time per exam measures it.

**What success looks like.** Offline: Measurement error vs expert and View classification accuracy. Online: Scan success rate by novice operators and Time per exam. The launch is judged on "Scan success rate by novice operators" while "Time per exam" must not get worse.

## Objective, loss and constraints

**Business objective.** Provide real-time probe guidance and automatic measurements (fetal biometry, cardiac EF) so non-experts acquire diagnostic-quality scans.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{SmoothL1}(\text{measure})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{seg}} | Segmentation loss: how well the anatomical structure is outlined. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SmoothL1} | Smooth L1 loss: like Huber loss, gentle on small errors and linear on large ones. |
| \text{measure} | The clinical measurement taken from the image, such as a length or diameter. |

**Hard constraints**

- 30 fps on handheld devices
- Operator-independent quality
- Regulatory clearance
- Edge inference

## The approach in one paragraph

Start with sonographer manual measurements. Then earn the move to lightweight CNN/transformer with temporal tracking for view classification and landmark regression, distilled to mobile NPU, and only if it beats the baseline on Measurement error vs expert and View classification accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around View-quality score | Probability of a standard diagnostic view. Guidance. Guard against: calibrated. |
| Add Anatomical landmark heatmaps | Keypoint localisations. Measurement. Guard against: landmark annotation. |
| Add Cardiac phase detection | End-diastole and systole frames. EF computation. Guard against: tracking. |
| Run it as one pipeline | Probe stream (handheld device), View classifier (mobile NPU), Guidance generator (direction model), Landmark tracker (regression net), Measurement calculator (geometry) and Saved study (PACS), with Clinician confirmation off the critical path. |
| Optimise the right thing | The objective weighs segmentation loss: how well the anatomical structure is outlined, so the model is trained on the cost of the decision and not on a generic score. |
| Handle patient body habitus reduces image quality | Quality-adaptive guidance and refusal to measure. |

**Deliberately not doing**

- Gain and depth settings: acquisition variables.
- Probe vendor: domain.

**How the approach is proven**

Prove it offline on Measurement error vs expert and View classification accuracy using time-ordered splits, then online on "Scan success rate by novice operators" with "Time per exam" as the guardrail. Watch for: Training on expert-acquired scans only and Evaluating after view selection.

## Baseline and production design

- **Baseline (build this first):** Sonographer manual measurements.
- **Production design:** Lightweight CNN/transformer with temporal tracking for view classification and landmark regression, distilled to mobile NPU.

## Why AI, and why this kind

**Why AI.** Provide real-time probe guidance and automatic measurements (fetal biometry, cardiac EF) so non-experts acquire diagnostic-quality scans. The evidence that separates good from bad outcomes (View-quality score, Anatomical landmark heatmaps, Cardiac phase detection) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "post-hoc image analysis" are what teams reach for first, and they fail because poor scans cannot be fixed after acquisition. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Lightweight CNN/transformer with temporal tracking for view classification and landmark regression, distilled to mobile NPU.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among View-quality score, Anatomical landmark heatmaps, Cardiac phase detection and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Sonographer manual measurements | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Lightweight CNN/transformer with temporal tracking for view classification and landmark regression, distilled to mobile NPU | chosen | Meets the 80 ms envelope at $94.99 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Scan success rate by novice operators) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on expert-acquired scans only.
- Evaluation trap: Evaluating after view selection.
- Patient body habitus reduces image quality: measurement errors.
- Probe vendor domain shift: landmark errors.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
