# Diabetic Retinopathy Screening: use-case brief

> Generated from the blueprint `healthcare/diabetic-retinopathy-screening` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Diabetic Retinopathy Screening · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Screen fundus photographs for referable diabetic retinopathy in primary care, with a safe referral path for ungradable images. The system has to run interactively, within a few seconds, inside these limits: Sensitivity above 90% and specificity above 85%, Works with handheld cameras and Offline-capable clinics.

**Why it is hard.** The obvious approach is forcing a grade on every image, and it fails because poor images produce confident wrong grades. The second trap is in "Labels": the real signal is adjudicated consensus of multiple graders, while teams usually reach for single-grader labels.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $16.1K a month. A mistake is expensive in the way time to ophthalmology referral measures it.

**What success looks like.** Offline: Sensitivity and specificity for referable DR and Ungradable rate. Online: Screening completion rate and Time to ophthalmology referral. The launch is judged on "Screening completion rate" while "Time to ophthalmology referral" must not get worse.

## Objective, loss and constraints

**Business objective.** Screen fundus photographs for referable diabetic retinopathy in primary care, with a safe referral path for ungradable images.

**Training objective.** `\mathcal{L}=\mathrm{CE}(y_{\text{grade}},p)+\lambda\,\mathrm{Ordinal}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| y_{\text{grade}} | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t and request r) |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Ordinal} | An ordinal loss: penalises predictions by how far they fall from the true ordered grade. |

**Hard constraints**

- Sensitivity above 90% and specificity above 85%
- Works with handheld cameras
- Offline-capable clinics
- Ungradable image handling

## The approach in one paragraph

Start with ophthalmologist grading with tele-review. Then earn the move to ordinal CNN/ViT ensemble with quality gate and lesion attention maps, on-device inference for clinics with cloud fallback, and only if it beats the baseline on Sensitivity and specificity for referable DR and Ungradable rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lesion-level evidence | Microaneurysm and haemorrhage detection maps. Explains grades. Guard against: annotate with expert segmentation. |
| Add Image quality score | Focus, illumination and field coverage. Gate. Guard against: calibrated on device types. |
| Add Ordinal grade probability | Distribution over disease grades. Referral decision. Guard against: calibrate thresholds by population. |
| Run it as one pipeline | Fundus capture (handheld camera), Quality assessor (on-device CNN), Grading ensemble (ViT and CNN), Referral policy (threshold and ungradable rules), Clinic app (result UI) and Outcome follow-up (referrals), with Ophthalmology review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle dilated vs undilated pupils | Quality gate tuned per device and recapture prompts. |

**Deliberately not doing**

- Image brightness: device effect.
- Patient ID: none.

**How the approach is proven**

Prove it offline on Sensitivity and specificity for referable DR and Ungradable rate using time-ordered splits, then online on "Screening completion rate" with "Time to ophthalmology referral" as the guardrail. Watch for: Validation on tertiary-hospital images only and Image selection excluded ungradable cases.

## Baseline and production design

- **Baseline (build this first):** Ophthalmologist grading with tele-review.
- **Production design:** Ordinal CNN/ViT ensemble with quality gate and lesion attention maps, on-device inference for clinics with cloud fallback.

## Why AI, and why this kind

**Why AI.** Screen fundus photographs for referable diabetic retinopathy in primary care, with a safe referral path for ungradable images. The evidence that separates good from bad outcomes (Lesion-level evidence, Image quality score, Ordinal grade probability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "forcing a grade on every image" are what teams reach for first, and they fail because poor images produce confident wrong grades. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Ordinal CNN/ViT ensemble with quality gate and lesion attention maps, on-device inference for clinics with cloud fallback.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lesion-level evidence, Image quality score, Ordinal grade probability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Ophthalmologist grading with tele-review | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Ordinal CNN/ViT ensemble with quality gate and lesion attention maps, on-device inference for clinics with cloud fallback | chosen | Meets the 2500 ms envelope at $8.92 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Screening completion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Validation on tertiary-hospital images only.
- Evaluation trap: Image selection excluded ungradable cases.
- Dilated vs undilated pupils: image quality differs across clinics.
- Population shift (different ethnic fundus pigmentation): sensitivity gap.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
