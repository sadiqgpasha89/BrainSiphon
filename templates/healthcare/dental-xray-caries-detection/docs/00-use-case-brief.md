# Dental X-Ray Caries & Pathology Detection: use-case brief

> Generated from the blueprint `healthcare/dental-xray-caries-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dental X-Ray Caries & Pathology Detection · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Highlight caries, bone loss and periapical lesions on dental radiographs to improve diagnostic consistency and patient communication. The system has to run interactively, within a few seconds, inside these limits: Dentist final decision, Multi-vendor sensors and Low latency chairside.

**Why it is hard.** The obvious approach is single annotator labels, and it fails because caries boundaries are subjective. The second trap is in "Utility": the real signal is overlays plus patient-facing visuals, while teams usually reach for black-box labels.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $19.9K a month. A mistake is expensive in the way treatment acceptance measures it.

**What success looks like.** Offline: Lesion-level sensitivity at fixed FP per image and Segmentation Dice. Online: Diagnostic agreement among dentists and Treatment acceptance. The launch is judged on "Diagnostic agreement among dentists" while "Treatment acceptance" must not get worse.

## Objective, loss and constraints

**Business objective.** Highlight caries, bone loss and periapical lesions on dental radiographs to improve diagnostic consistency and patient communication.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{det}}+\mathcal{L}_{\text{seg}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{det}} | Detection loss: how well objects are found and their boxes placed. |
| \mathcal{L}_{\text{seg}} | Segmentation loss: how well the region of interest is outlined pixel by pixel. |

**Hard constraints**

- Dentist final decision
- Multi-vendor sensors
- Low latency chairside
- Explainable overlays

## The approach in one paragraph

Start with dentist visual reading. Then earn the move to segmentation network with tooth detection and consensus-calibrated thresholds, running on chairside GPU or cloud API, and only if it beats the baseline on Lesion-level sensitivity at fixed FP per image and Segmentation Dice after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lesion segmentation map | Pixel-level mask. Localisation. Guard against: annotation protocol. |
| Add Tooth numbering | FDI tooth identification. Charting. Guard against: tooth detection accuracy. |
| Add Bone-level measurement | Distance CEJ to bone. Periodontal staging. Guard against: calibrated pixel size. |
| Run it as one pipeline | Sensor image (DICOM or proprietary), Preprocessor (normalisation), Tooth detector (detection net), Pathology segmenter (U-Net variant), Chart generator (structured findings) and Outcome confirmation (treatment records), with Dentist review off the critical path. |
| Optimise the right thing | The objective weighs detection loss: how well objects are found and their boxes placed, so the model is trained on the cost of the decision and not on a generic score. |
| Handle overlapping teeth in bitewings | Multi-view fusion and quality prompts. |

**Deliberately not doing**

- Sensor brand: domain.
- Image contrast: acquisition.

**How the approach is proven**

Prove it offline on Lesion-level sensitivity at fixed FP per image and Segmentation Dice using time-ordered splits, then online on "Diagnostic agreement among dentists" with "Treatment acceptance" as the guardrail. Watch for: Single clinic data and Consensus labels differ from clinical decisions.

## Baseline and production design

- **Baseline (build this first):** Dentist visual reading.
- **Production design:** Segmentation network with tooth detection and consensus-calibrated thresholds, running on chairside GPU or cloud API.

## Why AI, and why this kind

**Why AI.** Highlight caries, bone loss and periapical lesions on dental radiographs to improve diagnostic consistency and patient communication. The evidence that separates good from bad outcomes (Lesion segmentation map, Tooth numbering, Bone-level measurement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single annotator labels" are what teams reach for first, and they fail because caries boundaries are subjective. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Segmentation network with tooth detection and consensus-calibrated thresholds, running on chairside GPU or cloud API.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lesion segmentation map, Tooth numbering, Bone-level measurement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Dentist visual reading | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Segmentation network with tooth detection and consensus-calibrated thresholds, running on chairside GPU or cloud API | chosen | Meets the 2500 ms envelope at $2.21 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Diagnostic agreement among dentists) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Single clinic data.
- Evaluation trap: Consensus labels differ from clinical decisions.
- Overlapping teeth in bitewings: missed interproximal caries.
- Sensor firmware changes gamma: detection thresholds drift.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
