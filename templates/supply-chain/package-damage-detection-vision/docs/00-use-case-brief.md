# Package Damage Detection: use-case brief

> Generated from the blueprint `supply-chain/package-damage-detection-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Package Damage Detection · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect damaged parcels at hub induction and unloading to attribute liability and trigger repacking or claims early. The system has to run interactively, within a few seconds, inside these limits: Conveyor speed 2 m/s, Multi-camera views and Minimal false stops.

**Why it is hard.** The obvious approach is binary damaged flag, and it fails because claims and actions depend on severity. The second trap is in "Coverage": the real signal is multi-angle camera tunnel, while teams usually reach for single camera.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $42.9K a month. A mistake is expensive in the way damage rate trend measures it.

**What success looks like.** Offline: Damage detection recall at 1% false stop and Severity accuracy. Online: Damage claims resolved with evidence and Damage rate trend. The launch is judged on "Damage claims resolved with evidence" while "Damage rate trend" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect damaged parcels at hub induction and unloading to attribute liability and trigger repacking or claims early.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{CE}_{\text{severity}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{det}} | Detection loss: how well objects are found and their boxes placed. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CE}_{\text{severity}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |

**Hard constraints**

- Conveyor speed 2 m/s
- Multi-camera views
- Minimal false stops
- Evidence retention for claims

## The approach in one paragraph

Start with manual inspection spot checks. Then earn the move to multi-view detector with parcel tracking and severity head, edge inference at the conveyor and evidence image storage, and only if it beats the baseline on Damage detection recall at 1% false stop and Severity accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Dent and tear detection maps | Segmentation of damage. Localisation. Guard against: annotation protocol. |
| Add Package type and material | Box, polybag, pallet. Context. Guard against: classification. |
| Add Tracking across cameras | Parcel identity across views. Aggregation. Guard against: reID. |
| Run it as one pipeline | Camera tunnel (hub conveyor), Parcel tracker (multi-view ReID), Damage detector (YOLO on edge GPU), Severity classifier (small CNN), Claim record creator (rules) and Claims outcomes (labels), with Hub supervisor review off the critical path. |
| Optimise the right thing | The objective weighs detection loss: how well objects are found and their boxes placed, so the model is trained on the cost of the decision and not on a generic score. |
| Handle lighting changes at shift change | Auto exposure control and lighting-invariant augmentation. |

**Deliberately not doing**

- Label colour: none.
- Belt speed fluctuation: process.

**How the approach is proven**

Prove it offline on Damage detection recall at 1% false stop and Severity accuracy using time-ordered splits, then online on "Damage claims resolved with evidence" with "Damage rate trend" as the guardrail. Watch for: Training on staged damage and Not testing different shifts.

## Baseline and production design

- **Baseline (build this first):** Manual inspection spot checks.
- **Production design:** Multi-view detector with parcel tracking and severity head, edge inference at the conveyor and evidence image storage.

## Why AI, and why this kind

**Why AI.** Detect damaged parcels at hub induction and unloading to attribute liability and trigger repacking or claims early. The evidence that separates good from bad outcomes (Dent and tear detection maps, Package type and material, Tracking across cameras) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "binary damaged flag" are what teams reach for first, and they fail because claims and actions depend on severity. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multi-view detector with parcel tracking and severity head, edge inference at the conveyor and evidence image storage.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Dent and tear detection maps, Package type and material, Tracking across cameras and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual inspection spot checks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-view detector with parcel tracking and severity head, edge inference at the conveyor and evidence image storage | chosen | Meets the 2500 ms envelope at $0.954 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Damage claims resolved with evidence) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on staged damage.
- Evaluation trap: Not testing different shifts.
- Lighting changes at shift change: detection thresholds break.
- Shiny polybags produce glare: false damage alarms.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
