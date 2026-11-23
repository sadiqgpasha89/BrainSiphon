# Security Camera Health Monitoring: use-case brief

> Generated from the blueprint `public-safety/security-camera-health-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Security Camera Health Monitoring · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect blurred, blocked, misaligned or offline cameras from image statistics and network data so coverage is kept and failures are fixed before incidents need the footage. The system has to run as a scheduled batch job, inside these limits: Health score per camera updated hourly, Reasons such as blur, tilt or blocked and Work orders created for confirmed faults.

**Why it is hard.** The obvious approach is offline pings only, and it fails because a camera can be online and useless. The second trap is in "Scope": the real signal is image quality and position, while teams usually reach for content of the scene.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $2.6K a month. A mistake is expensive in the way time to repair measures it.

**What success looks like.** Offline: Fault detection recall, Reason accuracy and False tickets. Online: Camera uptime, Time to repair and Footage gaps found in incidents. The launch is judged on "Camera uptime" while "Time to repair" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect blurred, blocked, misaligned or offline cameras from image statistics and network data so coverage is kept and failures are fixed before incidents need the footage.

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

- Health score per camera updated hourly
- Reasons such as blur, tilt or blocked
- Work orders created for confirmed faults
- No content analysis of people
- 50K cameras

## The approach in one paragraph

Start with periodic manual checks of camera views and offline alerts, because they are the standard process. Then earn the move to a health model on image statistics and network data with reason codes, a repair priority by site importance and a work order link, and only if it beats the baseline on Fault detection recall and Reason accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Sharpness trend | Focus measure over time. Blur. Guard against: from image statistics. |
| Add View change | Difference from a reference view. Misalignment. Guard against: from images. |
| Add Brightness and contrast | Exposure statistics. Obstruction or failure. Guard against: from images. |
| Run it as one pipeline | Image statistics and network data (video management system), Health model (classifier), Reason coding (rules), Priority by site (rules), Work order (facilities system), Technician confirmation (field app) and Retraining (quarterly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle seasonal light change | Seasonal baselines. |

**Deliberately not doing**

- Camera name: an identifier.
- Installer name: irrelevant.
- Vendor: irrelevant.

**How the approach is proven**

Prove it offline on Fault detection recall, Reason accuracy and False tickets using time-ordered splits, then online on "Camera uptime" with "Time to repair" as the guardrail. Watch for: Offline pings only, Scene content analysis and Reports with no repair plan.

## Baseline and production design

- **Baseline (build this first):** Periodic manual checks of camera views and offline alerts, because they are the standard process.
- **Production design:** A health model on image statistics and network data with reason codes, a repair priority by site importance and a work order link.

## Why AI, and why this kind

**Why AI.** Detect blurred, blocked, misaligned or offline cameras from image statistics and network data so coverage is kept and failures are fixed before incidents need the footage. The evidence that separates good from bad outcomes (Sharpness trend, View change, Brightness and contrast) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "offline pings only" are what teams reach for first, and they fail because A camera can be online and useless. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A health model on image statistics and network data with reason codes, a repair priority by site importance and a work order link.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Sharpness trend, View change, Brightness and contrast and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic manual checks of camera views and offline alerts, because they are the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A health model on image statistics and network data with reason codes, a repair priority by site importance and a work order link | chosen | Meets the run-window envelope at $0.029 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Camera uptime) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Offline pings only.
- Evaluation trap: Scene content analysis.
- Seasonal light change: exposure shifts.
- Planned moves: cameras are repositioned on purpose.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
