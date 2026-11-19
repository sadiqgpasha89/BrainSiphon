# Progress Monitoring from Drone Imagery: use-case brief

> Generated from the blueprint `real-estate/progress-monitoring-from-drone-imagery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Progress Monitoring from Drone Imagery · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare drone captures to the BIM or schedule to estimate progress by element and flag deviations. The system has to run as a scheduled batch job, inside these limits: Drone capture weekly at the agreed flight times, Accuracy reported for each element type and Privacy rules followed for people and neighbouring properties.

**Why it is hard.** The obvious approach is raw images compared as they are, and it fails because misalignment produces apparent deviation that is not real. The second trap is in "Element": the real signal is status per building element such as slab, column and facade panel, while teams usually reach for a single percentage complete.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $21.1K a month. A mistake is expensive in the way rework found measures it.

**What success looks like.** Offline: Element accuracy and Registration error. Online: Report time and Rework found. The launch is judged on "Report time" while "Rework found" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare drone captures to the BIM or schedule to estimate progress by element and flag deviations.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{Huber}(\hat{p}-p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{seg}} | Segmentation loss: how well the region of interest is outlined pixel by pixel. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |

**Hard constraints**

- Drone capture weekly at the agreed flight times
- Accuracy reported for each element type
- Privacy rules followed for people and neighbouring properties
- Deviation tolerances defined per element

## The approach in one paragraph

Start with site walks and manual reports, because they are standard. Then earn the move to photogrammetry, registration to BIM, element classification and a progress dashboard, and only if it beats the baseline on Element accuracy and Registration error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Point cloud registration | Root-mean-square error of aligned points to BIM control points. Measures whether comparisons are meaningful. Guard against: drift over a large site needs control markers. |
| Add Element completion | Classifier probability that an element is built, per element. The base of progress reporting. Guard against: occlusion hides elements, so report visibility alongside. |
| Add Deviation | Millimetres between the as-built surface and the BIM surface per element. Quality control against the design. Guard against: noise in the point cloud limits precision, so state the error margin. |
| Run it as one pipeline | Drone capture (flights), Photogrammetry (pipeline), Registration (ICP), Element model (vision), Progress (rules) and PM dashboard (BI), with Archive off the critical path. |
| Optimise the right thing | The objective weighs segmentation loss: how well the region of interest is outlined pixel by pixel, so the model is trained on the cost of the decision and not on a generic score. |
| Handle occlusion | Combine with interior capture or site reports for hidden work. |

**Deliberately not doing**

- Lighting: Varies by time of day and does not change the structure.
- Weather: Affects image quality and must be normalised and not read as progress.
- Cloud: Cloud cover is a capture condition and has no information on the building.

**How the approach is proven**

Prove it offline on Element accuracy and Registration error using time-ordered splits, then online on "Report time" with "Rework found" as the guardrail. Watch for: Training on one site hides failures on sites with different structures and materials and Controlled flights under ideal conditions overstate accuracy in everyday use.

## Baseline and production design

- **Baseline (build this first):** Site walks and manual reports, because they are standard.
- **Production design:** Photogrammetry, registration to BIM, element classification and a progress dashboard.

## Why AI, and why this kind

**Why AI.** Compare drone captures to the BIM or schedule to estimate progress by element and flag deviations. The evidence that separates good from bad outcomes (Point cloud registration, Element completion, Deviation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw images compared as they are" are what teams reach for first, and they fail because misalignment produces apparent deviation that is not real. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Photogrammetry, registration to BIM, element classification and a progress dashboard.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Point cloud registration, Element completion, Deviation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Site walks and manual reports, because they are standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Photogrammetry, registration to BIM, element classification and a progress dashboard | chosen | Meets the run-window envelope at $2.35 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Report time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on one site hides failures on sites with different structures and materials.
- Evaluation trap: Controlled flights under ideal conditions overstate accuracy in everyday use.
- Occlusion: interior work or covered areas cannot be seen from the drone.
- Design change: a design change makes the BIM out of date so deviations are false.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
