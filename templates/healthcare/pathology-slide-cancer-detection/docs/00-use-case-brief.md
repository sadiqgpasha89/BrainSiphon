# Whole-Slide Pathology Cancer Detection: use-case brief

> Generated from the blueprint `healthcare/pathology-slide-cancer-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Whole-Slide Pathology Cancer Detection · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assist pathologists by detecting and localising tumour regions in gigapixel whole-slide images to prioritise and speed up diagnosis. The system has to run interactively, within a few seconds, inside these limits: 100,000x100,000 pixel slides, Weak slide-level labels and Stain variation across labs.

**Why it is hard.** The obvious approach is tile-level labels from heuristic masks, and it fails because heuristic masks encode annotator bias. The second trap is in "Stain": the real signal is stain normalisation and augmentation across scanners, while teams usually reach for one lab's staining.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $219.4K a month. A mistake is expensive in the way second-opinion rate measures it.

**What success looks like.** Offline: Slide-level AUROC and FROC for localisation and Calibration by site. Online: Time to diagnosis and Second-opinion rate. The launch is judged on "Time to diagnosis" while "Second-opinion rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Assist pathologists by detecting and localising tumour regions in gigapixel whole-slide images to prioritise and speed up diagnosis.

**Training objective.** `\mathcal{L}=\mathrm{BCE}_{\text{slide}}+\lambda\,\mathrm{MIL\text{-}attention}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE}_{\text{slide}} | Binary cross-entropy on whether the whole slide contains cancer. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{MIL\text{-}attention} | Multiple-instance attention term: learns which small tiles of the slide to focus on, since only the slide label is known. |

**Hard constraints**

- 100,000x100,000 pixel slides
- Weak slide-level labels
- Stain variation across labs
- Pathologist remains decision maker

## The approach in one paragraph

Start with pathologist microscopy review. Then earn the move to foundation-model tile encoder with attention-MIL aggregation, stain-robust training and viewer integration with heatmaps and uncertainty, and only if it beats the baseline on Slide-level AUROC and FROC for localisation and Calibration by site after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Tile attention scores | Attention-weighted tile importance. Localises tumour. Guard against: check heatmap fidelity against annotations. |
| Add Foundation-model tile embeddings | Pretrained pathology encoder features. Strong representation. Guard against: frozen vs finetuned tradeoff. |
| Add Slide-level uncertainty | Ensemble variance. Triage low confidence. Guard against: calibrate. |
| Run it as one pipeline | Slide scanner output (WSI storage), Tissue segmentation and tiling (preprocessing), Tile encoder (pathology foundation model), MIL aggregator (attention head) and Outcome concordance (final diagnosis), with Heatmap and report and Pathologist review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy on whether the whole slide contains cancer, so the model is trained on the cost of the decision and not on a generic score. |
| Handle scanner firmware update changes colour profile | Stain-normalisation monitors and recalibration set per scanner. |

**Deliberately not doing**

- Slide background area: irrelevant.
- Scanner serial: artefact.

**How the approach is proven**

Prove it offline on Slide-level AUROC and FROC for localisation and Calibration by site using time-ordered splits, then online on "Time to diagnosis" with "Second-opinion rate" as the guardrail. Watch for: Training on a single institution and Labels from consensus panel not routine practice.

## Baseline and production design

- **Baseline (build this first):** Pathologist microscopy review.
- **Production design:** Foundation-model tile encoder with attention-MIL aggregation, stain-robust training and viewer integration with heatmaps and uncertainty.

## Why AI, and why this kind

**Why AI.** Assist pathologists by detecting and localising tumour regions in gigapixel whole-slide images to prioritise and speed up diagnosis. The evidence that separates good from bad outcomes (Tile attention scores, Foundation-model tile embeddings, Slide-level uncertainty) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "tile-level labels from heuristic masks" are what teams reach for first, and they fail because heuristic masks encode annotator bias. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Foundation-model tile encoder with attention-MIL aggregation, stain-robust training and viewer integration with heatmaps and uncertainty.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Tile attention scores, Foundation-model tile embeddings, Slide-level uncertainty and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Pathologist microscopy review | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Foundation-model tile encoder with attention-MIL aggregation, stain-robust training and viewer integration with heatmaps and uncertainty | chosen | Meets the 2500 ms envelope at $243.76 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to diagnosis) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on a single institution.
- Evaluation trap: Labels from consensus panel not routine practice.
- Scanner firmware update changes colour profile: model sensitivity drops.
- Rare tumour subtype: missed detection.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
