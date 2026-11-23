# Vision-Guided Bin Picking: use-case brief

> Generated from the blueprint `manufacturing/vision-guided-bin-picking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vision-Guided Bin Picking · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Locate and grasp randomly placed parts in bins using 3D vision so robot cells can feed machines without precise fixturing. The system has to run in under 100 milliseconds, inside these limits: Pose estimate within 80 ms, Grasp success above 98% and Collision checks before each motion.

**Why it is hard.** The obvious approach is annotated images only, and it fails because image annotation does not equal a good grasp. The second trap is in "Safety": the real signal is motion planning with collision and speed limits in the controller, while teams usually reach for model-driven motion.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $238.4K a month. A mistake is expensive in the way operator interventions measures it.

**What success looks like.** Offline: Grasp success rate per part type, Pose error and Cycle time. Online: Picks per hour, Operator interventions and Jams. The launch is judged on "Picks per hour" while "Operator interventions" must not get worse.

## Objective, loss and constraints

**Business objective.** Locate and grasp randomly placed parts in bins using 3D vision so robot cells can feed machines without precise fixturing.

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

- Pose estimate within 80 ms
- Grasp success above 98%
- Collision checks before each motion
- Fallback to operator assistance on repeated fails
- 15 picks per minute per cell

## The approach in one paragraph

Start with template matching on 3D point clouds with a fixed grasp library, because it is robust and widely used. Then earn the move to a pose estimation network with grasp ranking and a classical motion planner with collision checking, plus a self-supervised data loop from grasp outcomes, and only if it beats the baseline on Grasp success rate per part type and Pose error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pose estimate confidence | Confidence of the part pose. Grasp decision. Guard against: calibrated. |
| Add Grasp reachability | Whether the gripper can reach without collision. Feasibility. Guard against: from the cell model. |
| Add Part overlap and occlusion | Share of the part visible. Failure risk. Guard against: from the point cloud. |
| Run it as one pipeline | Point cloud capture (3D camera), Segmentation and pose (vision model on edge GPU), Grasp ranking (learned scorer), Motion plan and collision check (robot controller), Grasp execution (robot), Outcome label (gripper sensors) and Retraining (nightly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle reflective parts | Multi-exposure capture and filters. |

**Deliberately not doing**

- Operator name: not a driver.
- Part colour alone: lighting effect.
- Image timestamp: an artefact.

**How the approach is proven**

Prove it offline on Grasp success rate per part type, Pose error and Cycle time using time-ordered splits, then online on "Picks per hour" with "Operator interventions" as the guardrail. Watch for: Training on annotation only, Model-driven motion without a planner and Demo bins.

## Baseline and production design

- **Baseline (build this first):** Template matching on 3D point clouds with a fixed grasp library, because it is robust and widely used.
- **Production design:** A pose estimation network with grasp ranking and a classical motion planner with collision checking, plus a self-supervised data loop from grasp outcomes.

## Why AI, and why this kind

**Why AI.** Locate and grasp randomly placed parts in bins using 3D vision so robot cells can feed machines without precise fixturing. The evidence that separates good from bad outcomes (Pose estimate confidence, Grasp reachability, Part overlap and occlusion) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "annotated images only" are what teams reach for first, and they fail because image annotation does not equal a good grasp. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A pose estimation network with grasp ranking and a classical motion planner with collision checking, plus a self-supervised data loop from grasp outcomes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pose estimate confidence, Grasp reachability, Part overlap and occlusion and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template matching on 3D point clouds with a fixed grasp library, because it is robust and widely used | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A pose estimation network with grasp ranking and a classical motion planner with collision checking, plus a self-supervised data loop from grasp outcomes | chosen | Meets the 80 ms envelope at $0.265 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Picks per hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on annotation only.
- Evaluation trap: Model-driven motion without a planner.
- Reflective parts: depth data is noisy.
- Stuck pick: the part jams in the bin.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
