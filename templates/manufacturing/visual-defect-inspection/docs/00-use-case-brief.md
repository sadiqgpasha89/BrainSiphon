# Visual Defect Inspection: use-case brief

> Generated from the blueprint `manufacturing/visual-defect-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Visual Defect Inspection · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships. The system has to run in under 100 milliseconds, inside these limits: Decision within 80 ms at line speed, Escape rate below 0.5% at a false reject rate under 2% and Every reject keeps its image and model version for traceability.

**Why it is hard.** The obvious approach is operator rejects at the line, and it fails because operators reject for many reasons including doubt. The second trap is in "Data": the real signal is images from every shift, lot and lighting condition, while teams usually reach for one clean batch.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $391.0K a month. A mistake is expensive in the way false reject cost measures it.

**What success looks like.** Offline: Recall at fixed false reject rate per defect class, Escape rate on held-out lots and Calibration by class. Online: Customer escapes per million, False reject cost and Inspection labour hours. The launch is judged on "Customer escapes per million" while "False reject cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships.

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

- Decision within 80 ms at line speed
- Escape rate below 0.5% at a false reject rate under 2%
- Every reject keeps its image and model version for traceability
- Operators can override and relabel
- 600 parts per minute per line

## The approach in one paragraph

Start with a rule-based vision check with fixed thresholds on edges and area, because it is stable and shows what a learned model must beat. Then earn the move to a detection and segmentation model on an edge GPU per line with calibrated per-class thresholds, an active-learning loop from operator corrections and a drift monitor on image statistics, and only if it beats the baseline on Recall at fixed false reject rate per defect class and Escape rate on held-out lots after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Defect probability map | Model score per image region. Locates and sizes the defect. Guard against: calibrate per defect class. |
| Add Part pose and fixture state | Position and orientation of the part in frame. Reduces false alarms. Guard against: from the fixture sensors. |
| Add Lighting and lens drift indicators | Image brightness and focus statistics. Warns of camera drift. Guard against: track per camera. |
| Run it as one pipeline | Image capture and trigger (line camera), Quality gate on image (blur and lighting check), Defect detection (vision model on edge GPU), Calibrated thresholds (per class cut-offs) and Reject or flag (PLC interface), with Operator review and relabel and Retrain queue off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle lighting change | Lighting statistics monitored and automatic recalibration alerts. |

**Deliberately not doing**

- Operator name: not a defect cause.
- Image file timestamp alone: no link to the defect.
- Background clutter: an acquisition artefact.

**How the approach is proven**

Prove it offline on Recall at fixed false reject rate per defect class, Escape rate on held-out lots and Calibration by class using time-ordered splits, then online on "Customer escapes per million" with "False reject cost" as the guardrail. Watch for: Training on operator rejects as truth, One lot for all training and Evaluating on random frames from the same lot.

## Baseline and production design

- **Baseline (build this first):** A rule-based vision check with fixed thresholds on edges and area, because it is stable and shows what a learned model must beat.
- **Production design:** A detection and segmentation model on an edge GPU per line with calibrated per-class thresholds, an active-learning loop from operator corrections and a drift monitor on image statistics.

## Why AI, and why this kind

**Why AI.** Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships. The evidence that separates good from bad outcomes (Defect probability map, Part pose and fixture state, Lighting and lens drift indicators) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "operator rejects at the line" are what teams reach for first, and they fail because operators reject for many reasons including doubt. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detection and segmentation model on an edge GPU per line with calibrated per-class thresholds, an active-learning loop from operator corrections and a drift monitor on image statistics.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Defect probability map, Part pose and fixture state, Lighting and lens drift indicators and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rule-based vision check with fixed thresholds on edges and area, because it is stable and shows what a learned model must beat | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detection and segmentation model on an edge GPU per line with calibrated per-class thresholds, an active-learning loop from operator corrections and a drift monitor on image statistics | chosen | Meets the 80 ms envelope at $0.217 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Customer escapes per million) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on operator rejects as truth.
- Evaluation trap: One lot for all training.
- Lighting change: brightness shifts and false rejects rise.
- New product variant: the model has never seen the part.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
