# PCB Solder Joint Inspection: use-case brief

> Generated from the blueprint `manufacturing/pcb-solder-joint-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** PCB Solder Joint Inspection · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify solder joints and component placement on circuit boards from 2D and 3D images so shorts, opens and tombstones are caught before test. The system has to run in under 100 milliseconds, inside these limits: Decision within 80 ms per board panel region, Escape rate under 0.1% and Defect class reported with the reference designator.

**Why it is hard.** The obvious approach is machine reject flags, and it fails because machines over-reject for marginal joints. The second trap is in "Variation": the real signal is components from many suppliers and reels, while teams usually reach for a single golden board.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $78.3K a month. A mistake is expensive in the way repair time measures it.

**What success looks like.** Offline: Recall and precision per defect class, Escape rate against in-circuit test and Programme setup time. Online: Boards failing at test, Repair time and False call rate at inspection. The launch is judged on "Boards failing at test" while "Repair time" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify solder joints and component placement on circuit boards from 2D and 3D images so shorts, opens and tombstones are caught before test.

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

- Decision within 80 ms per board panel region
- Escape rate under 0.1%
- Defect class reported with the reference designator
- Programme change for a new board in under 4 hours
- 900 boards per hour

## The approach in one paragraph

Start with golden-board comparison with fixed tolerances per joint, because it is the incumbent in many lines. Then earn the move to a joint-level classifier on 2D and 3D features with per-package thresholds, linked paste and reflow signals for root cause, and a programme generator from the placement file, and only if it beats the baseline on Recall and precision per defect class and Escape rate against in-circuit test after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Joint shape and volume | 3D height map statistics per joint. Core quality signal. Guard against: needs calibrated height. |
| Add Component offset and rotation | Placement offsets against the pad. Placement errors. Guard against: from the placement file. |
| Add Stencil and paste measurement | Paste volume from the printer inspection. Upstream cause. Guard against: join by board id. |
| Run it as one pipeline | Board image and height capture (inspection machine), Joint extraction (geometry mapping), Joint classifier (vision model), Package thresholds (calibration table), Repair guidance (repair station display) and Process cause link (paste and oven data), with Feedback from test off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new package type | Geometry-based rules with human review until enough examples exist. |

**Deliberately not doing**

- Board serial number: an identifier.
- Operator on shift: not a defect driver.
- Silkscreen colour: no link to quality.

**How the approach is proven**

Prove it offline on Recall and precision per defect class, Escape rate against in-circuit test and Programme setup time using time-ordered splits, then online on "Boards failing at test" with "Repair time" as the guardrail. Watch for: Trusting machine rejects as labels, One golden board and Ignoring upstream paste data.

## Baseline and production design

- **Baseline (build this first):** Golden-board comparison with fixed tolerances per joint, because it is the incumbent in many lines.
- **Production design:** A joint-level classifier on 2D and 3D features with per-package thresholds, linked paste and reflow signals for root cause, and a programme generator from the placement file.

## Why AI, and why this kind

**Why AI.** Classify solder joints and component placement on circuit boards from 2D and 3D images so shorts, opens and tombstones are caught before test. The evidence that separates good from bad outcomes (Joint shape and volume, Component offset and rotation, Stencil and paste measurement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "machine reject flags" are what teams reach for first, and they fail because machines over-reject for marginal joints. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A joint-level classifier on 2D and 3D features with per-package thresholds, linked paste and reflow signals for root cause, and a programme generator from the placement file.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Joint shape and volume, Component offset and rotation, Stencil and paste measurement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Golden-board comparison with fixed tolerances per joint, because it is the incumbent in many lines | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A joint-level classifier on 2D and 3D features with per-package thresholds, linked paste and reflow signals for root cause, and a programme generator from the placement file | chosen | Meets the 80 ms envelope at $0.174 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Boards failing at test) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Trusting machine rejects as labels.
- Evaluation trap: One golden board.
- New package type: no training examples.
- Warped board: height maps are distorted.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
