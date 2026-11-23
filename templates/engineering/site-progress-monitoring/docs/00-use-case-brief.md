# Site Progress Monitoring: use-case brief

> Generated from the blueprint `engineering/site-progress-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Site Progress Monitoring · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare site photos, drone and scan data with the model and schedule to estimate progress by element and area, using scene-level data and never identifying workers. The system has to run as a scheduled batch job, inside these limits: Progress by element and area only, Faces and people blurred at capture and Site manager confirms progress claims.

**Why it is hard.** The obvious approach is workers or crews, and it fails because worker tracking raises legal and trust issues. The second trap is in "Truth": the real signal is verified inspections, while teams usually reach for percent complete reports.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way disputes over progress measures it.

**What success looks like.** Offline: Element state accuracy, Progress error against inspections and Blur recall. Online: Progress reporting time, Disputes over progress and Schedule surprises. The launch is judged on "Progress reporting time" while "Disputes over progress" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare site photos, drone and scan data with the model and schedule to estimate progress by element and area, using scene-level data and never identifying workers.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Progress by element and area only
- Faces and people blurred at capture
- Site manager confirms progress claims
- Weekly capture of 100 sites
- Imagery retention limited

## The approach in one paragraph

Start with site managers estimating progress during walks, because it is the usual practice. Then earn the move to a progress pipeline that registers images to the model, classifies element states, blurs people at the edge and updates a progress view for schedule review, and only if it beats the baseline on Element state accuracy and Progress error against inspections after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Element visibility and state | Installed, partial or absent. Core. Guard against: from imagery. |
| Add Model element match | Which element is visible. Core. Guard against: from registration. |
| Add Schedule activity link | Activity linked to elements. Comparison. Guard against: from the schedule. |
| Run it as one pipeline | Image and scan capture (site cameras and drones), People blurring (edge model), Registration to model (vision), Element state classifier (vision model) and Progress mapping (schedule link), with Site manager review and Progress report off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle occlusion | Coverage confidence. |

**Deliberately not doing**

- Worker identity: personal data.
- Photographer name: personal data.
- Camera model: weak link.

**How the approach is proven**

Prove it offline on Element state accuracy, Progress error against inspections and Blur recall using time-ordered splits, then online on "Progress reporting time" with "Disputes over progress" as the guardrail. Watch for: Worker tracking, Percent complete as truth and Identifiable image storage.

## Baseline and production design

- **Baseline (build this first):** Site managers estimating progress during walks, because it is the usual practice.
- **Production design:** A progress pipeline that registers images to the model, classifies element states, blurs people at the edge and updates a progress view for schedule review.

## Why AI, and why this kind

**Why AI.** Compare site photos, drone and scan data with the model and schedule to estimate progress by element and area, using scene-level data and never identifying workers. The evidence that separates good from bad outcomes (Element visibility and state, Model element match, Schedule activity link) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "workers or crews" are what teams reach for first, and they fail because worker tracking raises legal and trust issues. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A progress pipeline that registers images to the model, classifies element states, blurs people at the edge and updates a progress view for schedule review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Element visibility and state, Model element match, Schedule activity link and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Site managers estimating progress during walks, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A progress pipeline that registers images to the model, classifies element states, blurs people at the edge and updates a progress view for schedule review | chosen | Meets the run-window envelope at $0.043 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Progress reporting time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Worker tracking.
- Evaluation trap: Percent complete as truth.
- Occlusion: scaffolding hides work.
- Similar elements: hidden details are alike.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
