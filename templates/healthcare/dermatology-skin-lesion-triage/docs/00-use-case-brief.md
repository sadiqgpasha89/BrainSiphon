# Dermatology Skin Lesion Triage: use-case brief

> Generated from the blueprint `healthcare/dermatology-skin-lesion-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dermatology Skin Lesion Triage · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Triage skin lesion photos from primary care and consumers to urgent, routine or reassure, with strong performance across skin tones. The system has to run interactively, within a few seconds, inside these limits: Skin-tone fairness (Fitzpatrick I-VI), Image-quality variability and Sensitivity on melanoma.

**Why it is hard.** The obvious approach is average accuracy, and it fails because datasets are skewed toward light skin. The second trap is in "Capture": the real signal is capture guidance and quality gating, while teams usually reach for any user photo.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $14.5K a month. A mistake is expensive in the way unnecessary referrals measures it.

**What success looks like.** Offline: Melanoma sensitivity by Fitzpatrick group and Calibration by group. Online: Time to specialist for urgent lesions and Unnecessary referrals. The launch is judged on "Time to specialist for urgent lesions" while "Unnecessary referrals" must not get worse.

## Objective, loss and constraints

**Business objective.** Triage skin lesion photos from primary care and consumers to urgent, routine or reassure, with strong performance across skin tones.

**Training objective.** `\mathcal{L}=\mathrm{CE}+\lambda\,\mathrm{GroupDRO}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GroupDRO} | Group distributionally robust objective: minimises the loss of the worst-performing group instead of the average. |

**Hard constraints**

- Skin-tone fairness (Fitzpatrick I-VI)
- Image-quality variability
- Sensitivity on melanoma
- Regulatory and liability

## The approach in one paragraph

Start with dermatologist teleconsult. Then earn the move to ensemble CNN/ViT with quality gate, conformal prediction for uncertainty, and group-balanced fine-tuning, routing uncertain cases to dermatologists, and only if it beats the baseline on Melanoma sensitivity by Fitzpatrick group and Calibration by group after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lesion segmentation features | Border irregularity, colour variegation. ABCDE logic. Guard against: segmentation quality. |
| Add Dermoscopy vs clinical photo flag | Modality. Different distributions. Guard against: metadata. |
| Add Prior lesion comparison | Change over time. Evolution. Guard against: same-lesion linking. |
| Run it as one pipeline | Photo capture (app guidance), Quality gate (blur and lighting), Lesion classifier (ViT ensemble), Conformal uncertainty (prediction sets), Triage policy (thresholds) and Biopsy outcomes (labels), with Dermatologist review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle dark skin tones underrepresented | Targeted data collection and group-wise thresholds. |

**Deliberately not doing**

- Skin-marker pen ink: shortcut.
- Image ruler presence: dataset artefact.

**How the approach is proven**

Prove it offline on Melanoma sensitivity by Fitzpatrick group and Calibration by group using time-ordered splits, then online on "Time to specialist for urgent lesions" with "Unnecessary referrals" as the guardrail. Watch for: Public datasets with artefacts and Validation only on biopsied lesions.

## Baseline and production design

- **Baseline (build this first):** Dermatologist teleconsult.
- **Production design:** Ensemble CNN/ViT with quality gate, conformal prediction for uncertainty, and group-balanced fine-tuning, routing uncertain cases to dermatologists.

## Why AI, and why this kind

**Why AI.** Triage skin lesion photos from primary care and consumers to urgent, routine or reassure, with strong performance across skin tones. The evidence that separates good from bad outcomes (Lesion segmentation features, Dermoscopy vs clinical photo flag, Prior lesion comparison) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average accuracy" are what teams reach for first, and they fail because datasets are skewed toward light skin. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Ensemble CNN/ViT with quality gate, conformal prediction for uncertainty, and group-balanced fine-tuning, routing uncertain cases to dermatologists.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lesion segmentation features, Dermoscopy vs clinical photo flag, Prior lesion comparison and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Dermatologist teleconsult | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Ensemble CNN/ViT with quality gate, conformal prediction for uncertainty, and group-balanced fine-tuning, routing uncertain cases to dermatologists | chosen | Meets the 2500 ms envelope at $8.06 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to specialist for urgent lesions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Public datasets with artefacts.
- Evaluation trap: Validation only on biopsied lesions.
- Dark skin tones underrepresented: lower sensitivity.
- Selection bias to lesions that were biopsied: optimistic accuracy.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
