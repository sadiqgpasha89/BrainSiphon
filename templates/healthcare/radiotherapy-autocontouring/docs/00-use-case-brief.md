# Radiotherapy Auto-Contouring: use-case brief

> Generated from the blueprint `healthcare/radiotherapy-autocontouring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Radiotherapy Auto-Contouring · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Auto-segment organs at risk and target volumes on CT/MR to cut planning time from hours to minutes with clinician edits. The system has to run interactively, within a few seconds, inside these limits: Clinical acceptability, Edits tracked and Multi-vendor CT.

**Why it is hard.** The obvious approach is dice alone, and it fails because dice misses clinically significant boundary errors. The second trap is in "Variation": the real signal is institution-specific contouring guidelines, while teams usually reach for one universal style.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $94.7K a month. A mistake is expensive in the way plan quality indicators measures it.

**What success looks like.** Offline: Dice and 95th-percentile Hausdorff and Clinician edit time. Online: Planning time and Plan quality indicators. The launch is judged on "Planning time" while "Plan quality indicators" must not get worse.

## Objective, loss and constraints

**Business objective.** Auto-segment organs at risk and target volumes on CT/MR to cut planning time from hours to minutes with clinician edits.

**Training objective.** `\mathcal{L}=\mathrm{Dice}+\mathrm{CE}+\lambda\,\mathrm{SurfaceDistance}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Dice} | Dice loss: one minus the overlap between the predicted and true regions, used for segmentation. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SurfaceDistance} | Penalty on the distance between predicted and true organ boundaries. |

**Hard constraints**

- Clinical acceptability
- Edits tracked
- Multi-vendor CT
- Safety review for plans

## The approach in one paragraph

Start with atlas-based segmentation. Then earn the move to nnU-Net ensembles with institution fine-tuning, uncertainty maps and in-TPS editing integration, and only if it beats the baseline on Dice and 95th-percentile Hausdorff and Clinician edit time after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Organ-at-risk segmentation masks | 3D U-Net masks. Plan inputs. Guard against: atlas protocol. |
| Add Boundary uncertainty maps | Ensemble variance at boundaries. Where to review. Guard against: calibrated. |
| Add Anatomy variation flags | Unusual anatomy detection. Safety. Guard against: rare cases. |
| Run it as one pipeline | CT/MR import (DICOM), Preprocessing (resampling), Segmentation ensemble (nnU-Net on GPU), Uncertainty and QC (checks), Contour editor (TPS plugin), Physician approval (human) and Edit logging (feedback). |
| Optimise the right thing | The objective weighs dice loss: one minus the overlap between the predicted and true regions, used for segmentation, so the model is trained on the cost of the decision and not on a generic score. |
| Handle metal artefacts | Artefact detection and manual contouring prompt. |

**Deliberately not doing**

- Scanner brand: domain.
- Slice thickness: acquisition.

**How the approach is proven**

Prove it offline on Dice and 95th-percentile Hausdorff and Clinician edit time using time-ordered splits, then online on "Planning time" with "Plan quality indicators" as the guardrail. Watch for: Contours from the same clinicians used to train and Ignoring rare anatomy.

## Baseline and production design

- **Baseline (build this first):** Atlas-based segmentation.
- **Production design:** nnU-Net ensembles with institution fine-tuning, uncertainty maps and in-TPS editing integration.

## Why AI, and why this kind

**Why AI.** Auto-segment organs at risk and target volumes on CT/MR to cut planning time from hours to minutes with clinician edits. The evidence that separates good from bad outcomes (Organ-at-risk segmentation masks, Boundary uncertainty maps, Anatomy variation flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "dice alone" are what teams reach for first, and they fail because dice misses clinically significant boundary errors. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: nnU-Net ensembles with institution fine-tuning, uncertainty maps and in-TPS editing integration.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Organ-at-risk segmentation masks, Boundary uncertainty maps, Anatomy variation flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Atlas-based segmentation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| nnU-Net ensembles with institution fine-tuning, uncertainty maps and in-TPS editing integration | chosen | Meets the 2500 ms envelope at $105.24 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Planning time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Contours from the same clinicians used to train.
- Evaluation trap: Ignoring rare anatomy.
- Metal artefacts: segmentation failure.
- Post-surgical anatomy: model assumes normal anatomy.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
