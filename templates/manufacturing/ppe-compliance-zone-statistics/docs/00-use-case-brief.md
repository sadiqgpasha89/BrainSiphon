# PPE Compliance Zone Statistics: use-case brief

> Generated from the blueprint `manufacturing/ppe-compliance-zone-statistics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** PPE Compliance Zone Statistics · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate protective equipment compliance by zone and shift from cameras in aggregate, so EHS targets training and signage without monitoring individuals. The system has to run interactively, within a few seconds, inside these limits: Outputs are zone-level counts and never individual alerts, Faces blurred at the camera and Works-council and legal approval before use.

**Why it is hard.** The obvious approach is individual enforcement, and it fails because individual enforcement harms trust and breaks agreements. The second trap is in "Method": the real signal is anonymised detections with counts, while teams usually reach for stored video.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $113.8K a month. A mistake is expensive in the way training sessions targeted measures it.

**What success looks like.** Offline: Agreement with manual audits, Calibration of rates and Share of buckets suppressed. Online: Compliance rate in targeted zones, Training sessions targeted and Complaints about monitoring. The launch is judged on "Compliance rate in targeted zones" while "Training sessions targeted" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate protective equipment compliance by zone and shift from cameras in aggregate, so EHS targets training and signage without monitoring individuals.

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

- Outputs are zone-level counts and never individual alerts
- Faces blurred at the camera
- Works-council and legal approval before use
- Data retained for 30 days
- 500 cameras

## The approach in one paragraph

Start with periodic manual safety walks with checklists, because they are the standard audit and have known coverage. Then earn the move to a detector that counts people and PPE items per zone on edge devices, blurs faces at source, aggregates by hour and publishes zone statistics for EHS review, and only if it beats the baseline on Agreement with manual audits and Calibration of rates after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around PPE item detection rate | Share of detected people with each required item. Core statistic. Guard against: per zone. |
| Add Detection confidence | Confidence of the PPE classifier. Filters weak calls. Guard against: calibrated. |
| Add Zone and time bucket | Where and when. Targeting. Guard against: aggregated. |
| Run it as one pipeline | Camera capture and face blur (edge device), Person and PPE detection (vision model), Aggregation by zone and hour (edge analytics), Statistics upload (secure sync), EHS dashboard (BI tool), Training targeting (EHS) and Retention enforcement (storage policy). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle partial occlusion | Report as unknown not as non-compliant. |

**Deliberately not doing**

- Worker identity: privacy risk.
- Clothing brand: irrelevant.
- Face features: prohibited.

**How the approach is proven**

Prove it offline on Agreement with manual audits, Calibration of rates and Share of buckets suppressed using time-ordered splits, then online on "Compliance rate in targeted zones" with "Training sessions targeted" as the guardrail. Watch for: Individual enforcement, Storing raw video and Reporting unknown as non-compliant.

## Baseline and production design

- **Baseline (build this first):** Periodic manual safety walks with checklists, because they are the standard audit and have known coverage.
- **Production design:** A detector that counts people and PPE items per zone on edge devices, blurs faces at source, aggregates by hour and publishes zone statistics for EHS review.

## Why AI, and why this kind

**Why AI.** Estimate protective equipment compliance by zone and shift from cameras in aggregate, so EHS targets training and signage without monitoring individuals. The evidence that separates good from bad outcomes (PPE item detection rate, Detection confidence, Zone and time bucket) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individual enforcement" are what teams reach for first, and they fail because individual enforcement harms trust and breaks agreements. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detector that counts people and PPE items per zone on edge devices, blurs faces at source, aggregates by hour and publishes zone statistics for EHS review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among PPE item detection rate, Detection confidence, Zone and time bucket and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic manual safety walks with checklists, because they are the standard audit and have known coverage | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detector that counts people and PPE items per zone on edge devices, blurs faces at source, aggregates by hour and publishes zone statistics for EHS review | chosen | Meets the 2500 ms envelope at $0.126 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Compliance rate in targeted zones) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual enforcement.
- Evaluation trap: Storing raw video.
- Partial occlusion: pPE is hidden by equipment.
- Low sample size: too few people in a bucket.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
