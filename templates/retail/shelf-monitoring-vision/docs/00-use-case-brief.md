# Shelf Monitoring & Planogram Compliance: use-case brief

> Generated from the blueprint `retail/shelf-monitoring-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shelf Monitoring & Planogram Compliance · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales. The system has to run interactively, within a few seconds, inside these limits: Works on phone and robot images, New SKUs weekly and Edge inference in store.

**Why it is hard.** The obvious approach is closed-set classifier retrained per SKU, and it fails because weekly new SKUs make closed-set retraining impossible. The second trap is in "Action": the real signal is output prioritised tasks by lost-sales estimate, while teams usually reach for raw detections.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $16.1K a month. A mistake is expensive in the way lost sales recovered measures it.

**What success looks like.** Offline: Detection mAP and SKU top-1 accuracy and Task precision. Online: On-shelf availability and Lost sales recovered. The launch is judged on "On-shelf availability" while "Lost sales recovered" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{det}}+\mathcal{L}_{\text{cls}}+\lambda\,\mathcal{L}_{\text{planogram}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{det}} | Detection loss: how well objects are found and their boxes placed. |
| \mathcal{L}_{\text{cls}} | Classification loss: how well each detected item is given the right class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{planogram}} | Planogram loss: penalty when detected shelf contents disagree with the planned layout. |

**Hard constraints**

- Works on phone and robot images
- New SKUs weekly
- Edge inference in store
- Task creation within minutes

## The approach in one paragraph

Start with periodic manual audits with checklists. Then earn the move to detector plus SKU-embedding retrieval for open-set recognition, planogram-diff engine and prioritised task generator; models on edge GPUs, and only if it beats the baseline on Detection mAP and SKU top-1 accuracy and Task precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Facing count vs planogram | Detected facings minus planned facings. Compliance. Guard against: accurate planogram version. |
| Add Empty-slot detection | Empty gaps along the shelf edge. Out-of-stock. Guard against: occlusion handling. |
| Add Price-tag OCR match | Tag price vs system price. Pricing compliance. Guard against: tag detection quality. |
| Run it as one pipeline | Image capture (store devices), Edge detector (YOLO on Jetson), SKU recogniser (embedding retrieval), Planogram diff (rules engine), Task prioritiser (lost-sales model) and Store associate app (human tasks), with Resolution feedback off the critical path. |
| Optimise the right thing | The objective weighs detection loss: how well objects are found and their boxes placed, so the model is trained on the cost of the decision and not on a generic score. |
| Handle promotional displays off planogram | Promo-calendar-aware planogram versions. |

**Deliberately not doing**

- Shelf lighting colour: environment.
- Camera model: device artefact.

**How the approach is proven**

Prove it offline on Detection mAP and SKU top-1 accuracy and Task precision using time-ordered splits, then online on "On-shelf availability" with "Lost sales recovered" as the guardrail. Watch for: Evaluation on clean shelf photos and Different stores than training only in appearance.

## Baseline and production design

- **Baseline (build this first):** Periodic manual audits with checklists.
- **Production design:** Detector plus SKU-embedding retrieval for open-set recognition, planogram-diff engine and prioritised task generator; models on edge GPUs.

## Why AI, and why this kind

**Why AI.** Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales. The evidence that separates good from bad outcomes (Facing count vs planogram, Empty-slot detection, Price-tag OCR match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "closed-set classifier retrained per SKU" are what teams reach for first, and they fail because weekly new SKUs make closed-set retraining impossible. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Detector plus SKU-embedding retrieval for open-set recognition, planogram-diff engine and prioritised task generator; models on edge GPUs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Facing count vs planogram, Empty-slot detection, Price-tag OCR match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic manual audits with checklists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Detector plus SKU-embedding retrieval for open-set recognition, planogram-diff engine and prioritised task generator; models on edge GPUs | chosen | Meets the 2500 ms envelope at $3.57 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (On-shelf availability) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluation on clean shelf photos.
- Evaluation trap: Different stores than training only in appearance.
- Promotional displays off planogram: false non-compliance.
- Poor connectivity: tasks reach store staff late because uploads and results are delayed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
