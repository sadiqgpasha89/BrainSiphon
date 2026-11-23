# Site Hazard and PPE Detection: use-case brief

> Generated from the blueprint `engineering/site-hazard-ppe-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Site Hazard and PPE Detection · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect scene-level hazards such as missing edge protection, unguarded openings, blocked exits and exclusion zone breaches from site cameras and alert the safety manager, without identifying or scoring individual workers. The system has to run interactively, within a few seconds, inside these limits: No face recognition and no individual identification, Alerts by zone to safety managers and Imagery retention under 30 days.

**Why it is hard.** The obvious approach is named workers, and it fails because individual tracking is not allowed. The second trap is in "Cost": the real signal is missed hazards cost more than false alerts, while teams usually reach for equal weights.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $12.4K a month. A mistake is expensive in the way near misses measures it.

**What success looks like.** Offline: Hazard recall by class, False alert rate and Alert latency. Online: Hazards open beyond a day, Near misses and Time to correct hazards. The launch is judged on "Hazards open beyond a day" while "Near misses" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect scene-level hazards such as missing edge protection, unguarded openings, blocked exits and exclusion zone breaches from site cameras and alert the safety manager, without identifying or scoring individual workers.

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

- No face recognition and no individual identification
- Alerts by zone to safety managers
- Imagery retention under 30 days
- Alert within 10 s
- Works council agreement before deployment

## The approach in one paragraph

Start with safety walks and inspections by safety officers, because they are the standard control. Then earn the move to a scene-level detection system with edge blurring of people, hazard classes by zone and alerts to safety managers with images and tracked follow-up, and only if it beats the baseline on Hazard recall by class and False alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hazard condition classification | Open edge, blocked exit or zone breach. Core. Guard against: from a vision model. |
| Add Zone and activity context | What work is planned there. Context. Guard against: from the site plan. |
| Add Equipment proximity | Vehicle or crane near an exclusion zone. Risk. Guard against: from telematics. |
| Run it as one pipeline | Camera stream (site cameras), People blurring (edge model), Hazard classifier (vision model), Zone logic (rules), Safety manager alert (app) and Corrective action (safety log), with Review of alerts off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle night work | Infrared or lighting requirements. |

**Deliberately not doing**

- Worker identity: personal data.
- Camera brand: weak link.
- Clothing colour: weak link.

**How the approach is proven**

Prove it offline on Hazard recall by class, False alert rate and Alert latency using time-ordered splits, then online on "Hazards open beyond a day" with "Near misses" as the guardrail. Watch for: Individual identification, Equal error costs and Detection as discipline.

## Baseline and production design

- **Baseline (build this first):** Safety walks and inspections by safety officers, because they are the standard control.
- **Production design:** A scene-level detection system with edge blurring of people, hazard classes by zone and alerts to safety managers with images and tracked follow-up.

## Why AI, and why this kind

**Why AI.** Detect scene-level hazards such as missing edge protection, unguarded openings, blocked exits and exclusion zone breaches from site cameras and alert the safety manager, without identifying or scoring individual workers. The evidence that separates good from bad outcomes (Hazard condition classification, Zone and activity context, Equipment proximity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "named workers" are what teams reach for first, and they fail because individual tracking is not allowed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A scene-level detection system with edge blurring of people, hazard classes by zone and alerts to safety managers with images and tracked follow-up.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hazard condition classification, Zone and activity context, Equipment proximity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Safety walks and inspections by safety officers, because they are the standard control | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scene-level detection system with edge blurring of people, hazard classes by zone and alerts to safety managers with images and tracked follow-up | chosen | Meets the 2500 ms envelope at $0.138 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Hazards open beyond a day) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual identification.
- Evaluation trap: Equal error costs.
- Night work: low light lowers accuracy.
- Weather: rain or dust blur the view.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
