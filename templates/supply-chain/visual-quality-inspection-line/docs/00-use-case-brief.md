# Visual Quality Inspection on the Production Line: use-case brief

> Generated from the blueprint `supply-chain/visual-quality-inspection-line` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Visual Quality Inspection on the Production Line · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect surface defects and assembly errors on products at line speed with minimal false rejects. The system has to run in under 100 milliseconds, inside these limits: Line speed of 10 parts/s, Few defect examples and Stable lighting.

**Why it is hard.** The obvious approach is supervised defect classifier, and it fails because defect examples are rare and diverse. The second trap is in "Optics": the real signal is lighting and camera design first, while teams usually reach for algorithm fixes for bad imaging.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $94.7K a month. A mistake is expensive in the way scrap and rework cost measures it.

**What success looks like.** Offline: Defect recall at 0.5% false reject and Localisation accuracy. Online: Escape rate and Scrap and rework cost. The launch is judged on "Escape rate" while "Scrap and rework cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect surface defects and assembly errors on products at line speed with minimal false rejects.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{recon}}+\lambda\,\mathcal{L}_{\text{feature-distance}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{recon}} | Reconstruction loss: how well the model rebuilds a normal image, so defects show up as large errors. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{feature-distance}} | Feature-distance loss: keeps the representation of normal parts close together so that defects stand out. |

**Hard constraints**

- Line speed of 10 parts/s
- Few defect examples
- Stable lighting
- Explainable reject decisions

## The approach in one paragraph

Start with rule-based machine vision with templates. Then earn the move to patchCore-style anomaly detector with few-shot defect classifier on edge GPUs, with active learning from operator decisions, and only if it beats the baseline on Defect recall at 0.5% false reject and Localisation accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Anomaly score map | Patch-feature distance to normal. Localises defects. Guard against: normal set coverage. |
| Add Part pose and alignment | Registration residual. Reduces false alarms. Guard against: fixtures. |
| Add Defect-class classifier | Few-shot classes. Root cause. Guard against: labels. |
| Run it as one pipeline | Camera and lighting (station), Registration (alignment), Anomaly model (PatchCore on edge GPU), Defect classifier (few-shot), Reject actuator (PLC), Quality engineer (human) and Defect library (labels). |
| Optimise the right thing | The objective weighs reconstruction loss: how well the model rebuilds a normal image, so defects show up as large errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle product variant change | Variant-aware models and quick enrolment of golden samples. |

**Deliberately not doing**

- Conveyor vibration noise: environment.
- Background texture: fixture.

**How the approach is proven**

Prove it offline on Defect recall at 0.5% false reject and Localisation accuracy using time-ordered splits, then online on "Escape rate" with "Scrap and rework cost" as the guardrail. Watch for: Test defects staged not natural and Normal samples from one lighting setup.

## Baseline and production design

- **Baseline (build this first):** Rule-based machine vision with templates.
- **Production design:** PatchCore-style anomaly detector with few-shot defect classifier on edge GPUs, with active learning from operator decisions.

## Why AI, and why this kind

**Why AI.** Detect surface defects and assembly errors on products at line speed with minimal false rejects. The evidence that separates good from bad outcomes (Anomaly score map, Part pose and alignment, Defect-class classifier) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "supervised defect classifier" are what teams reach for first, and they fail because defect examples are rare and diverse. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: PatchCore-style anomaly detector with few-shot defect classifier on edge GPUs, with active learning from operator decisions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Anomaly score map, Part pose and alignment, Defect-class classifier and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based machine vision with templates | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| PatchCore-style anomaly detector with few-shot defect classifier on edge GPUs, with active learning from operator decisions | chosen | Meets the 80 ms envelope at $1.05 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Escape rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test defects staged not natural.
- Evaluation trap: Normal samples from one lighting setup.
- Product variant change: false rejects on new design.
- Lighting degrades over weeks: gradual false alarms.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
