# Medical Image De-Identification (DICOM): use-case brief

> Generated from the blueprint `healthcare/dicom-image-deidentification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Medical Image De-Identification (DICOM) · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Remove PHI from DICOM headers and burned-in pixel text (and facial features in head scans) at scale for research sharing. The system has to run as a scheduled batch job, inside these limits: Zero PHI leakage tolerance, Preserve clinical information and Audit of de-id decisions.

**Why it is hard.** The obvious approach is header scrubbing only, and it fails because burned-in annotations leak names. The second trap is in "Recall": the real signal is recall-prioritised redaction with spot-audit, while teams usually reach for accuracy.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $40.4K a month. A mistake is expensive in the way share-readiness throughput measures it.

**What success looks like.** Offline: PHI recall at 99.99% and Clinical content preservation score. Online: Privacy incident count and Share-readiness throughput. The launch is judged on "Privacy incident count" while "Share-readiness throughput" must not get worse.

## Objective, loss and constraints

**Business objective.** Remove PHI from DICOM headers and burned-in pixel text (and facial features in head scans) at scale for research sharing.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{OCR-det}}+\mathcal{L}_{\text{segmentation}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{OCR-det}} | Text-detection loss: how well burned-in text regions (names, dates) are located in the image. |
| \mathcal{L}_{\text{segmentation}} | Segmentation loss: how well the region of interest is outlined pixel by pixel. |

**Hard constraints**

- Zero PHI leakage tolerance
- Preserve clinical information
- Audit of de-id decisions
- Throughput of millions of studies

## The approach in one paragraph

Start with header tag blacklist scrubbing. Then earn the move to allow-list header processing, ensemble OCR/detector for pixel text, defacing models for head scans and statistical audit sampling, and only if it beats the baseline on PHI recall at 99.99% and Clinical content preservation score after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Burned-in text detections | Text region detections. PHI removal. Guard against: per-modality models. |
| Add DICOM tag allow-list | Retain allowed tags only. Privacy by design. Guard against: allow-list governance. |
| Add Face reconstruction risk | CT/MR facial features present. Re-identification. Guard against: defacing algorithm. |
| Run it as one pipeline | DICOM ingest (PACS export), Header sanitiser (allow-list), Pixel text detector (OCR ensemble), Defacing (3D model) and Research release (data room), with Quality audit and Privacy officer review off the critical path. |
| Optimise the right thing | The objective weighs text-detection loss: how well burned-in text regions (names, dates) are located in the image, so the model is trained on the cost of the decision and not on a generic score. |
| Handle unusual modality with new overlay format | New-modality validation before release. |

**Deliberately not doing**

- Study description free text: may contain names.
- Institution logos: non-PHI.

**How the approach is proven**

Prove it offline on PHI recall at 99.99% and Clinical content preservation score using time-ordered splits, then online on "Privacy incident count" with "Share-readiness throughput" as the guardrail. Watch for: Testing on common modalities only and Evaluating precision instead of recall.

## Baseline and production design

- **Baseline (build this first):** Header tag blacklist scrubbing.
- **Production design:** Allow-list header processing, ensemble OCR/detector for pixel text, defacing models for head scans and statistical audit sampling.

## Why AI, and why this kind

**Why AI.** Remove PHI from DICOM headers and burned-in pixel text (and facial features in head scans) at scale for research sharing. The evidence that separates good from bad outcomes (Burned-in text detections, DICOM tag allow-list, Face reconstruction risk) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "header scrubbing only" are what teams reach for first, and they fail because burned-in annotations leak names. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Allow-list header processing, ensemble OCR/detector for pixel text, defacing models for head scans and statistical audit sampling.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Burned-in text detections, DICOM tag allow-list, Face reconstruction risk and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Header tag blacklist scrubbing | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Allow-list header processing, ensemble OCR/detector for pixel text, defacing models for head scans and statistical audit sampling | chosen | Meets the run-window envelope at $22.45 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Privacy incident count) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Testing on common modalities only.
- Evaluation trap: Evaluating precision instead of recall.
- Unusual modality with new overlay format: an unseen overlay layout hides patient identifiers from the pixel text detector.
- Ultrasound cine with moving text: frame-level misses.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
