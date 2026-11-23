# Near-Miss Detection from Anonymised Video: use-case brief

> Generated from the blueprint `public-safety/near-miss-video-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Near-Miss Detection from Anonymised Video · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect conflicts between road users at junctions from anonymised video trajectories so engineers see danger before crashes occur. The system has to run as a scheduled batch job, inside these limits: Video reduced to anonymous tracks at the edge, No plate or face storage and Conflict severity measured by time-to-collision.

**Why it is hard.** The obvious approach is raw video clips, and it fails because clips need people to watch. The second trap is in "Privacy": the real signal is anonymous trajectories only, while teams usually reach for stored video.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 347 at peak, at an estimated $81.2K a month. A mistake is expensive in the way treatment effect measures it.

**What success looks like.** Offline: Track accuracy, Conflict indicator correlation with crashes and Detection recall by user type. Online: Severe conflicts per day, Treatment effect and Crashes at monitored sites. The launch is judged on "Severe conflicts per day" while "Treatment effect" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect conflicts between road users at junctions from anonymised video trajectories so engineers see danger before crashes occur.

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

- Video reduced to anonymous tracks at the edge
- No plate or face storage
- Conflict severity measured by time-to-collision
- Weekly site reports
- 300 junctions

## The approach in one paragraph

Start with crash records and occasional manual conflict studies, because they are the standard evidence. Then earn the move to an edge pipeline that converts video to anonymous trajectories, computes conflict indicators and delivers site reports with junction diagrams for engineers, and only if it beats the baseline on Track accuracy and Conflict indicator correlation with crashes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Road user trajectories | Positions and speeds of users. Basis. Guard against: from tracking. |
| Add Time-to-collision | Predicted time to collision. Severity. Guard against: computed. |
| Add User type | Pedestrian, cyclist or vehicle. Context. Guard against: from classification. |
| Run it as one pipeline | Video capture (junction cameras), Edge anonymisation (tracking model), Trajectory store (time-series store), Conflict computation (rules) and Treatment evaluation (before after), with Site report and Engineer review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle occlusion | Multi-camera views. |

**Deliberately not doing**

- Vehicle plate: personal data.
- Face features: prohibited.
- Clothing colour: irrelevant.

**How the approach is proven**

Prove it offline on Track accuracy, Conflict indicator correlation with crashes and Detection recall by user type using time-ordered splits, then online on "Severe conflicts per day" with "Treatment effect" as the guardrail. Watch for: Stored video, Counting conflicts with no validation and Face or plate features.

## Baseline and production design

- **Baseline (build this first):** Crash records and occasional manual conflict studies, because they are the standard evidence.
- **Production design:** An edge pipeline that converts video to anonymous trajectories, computes conflict indicators and delivers site reports with junction diagrams for engineers.

## Why AI, and why this kind

**Why AI.** Detect conflicts between road users at junctions from anonymised video trajectories so engineers see danger before crashes occur. The evidence that separates good from bad outcomes (Road user trajectories, Time-to-collision, User type) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw video clips" are what teams reach for first, and they fail because clips need people to watch. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: An edge pipeline that converts video to anonymous trajectories, computes conflict indicators and delivers site reports with junction diagrams for engineers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Road user trajectories, Time-to-collision, User type and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Crash records and occasional manual conflict studies, because they are the standard evidence | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An edge pipeline that converts video to anonymous trajectories, computes conflict indicators and delivers site reports with junction diagrams for engineers | chosen | Meets the run-window envelope at $0.090 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Severe conflicts per day) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Stored video.
- Evaluation trap: Counting conflicts with no validation.
- Occlusion: a bus hides a crossing.
- Tracking errors: users are swapped.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
