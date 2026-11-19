# Checkout-Free Store Vision: use-case brief

> Generated from the blueprint `retail/checkout-free-store-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Checkout-Free Store Vision · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Track shoppers and pick/put events with camera and weight sensors to produce accurate virtual baskets without checkout. The system has to run in under 100 milliseconds, inside these limits: Billing accuracy above 99.5%, Privacy (no face ID) and Real-time inside store.

**Why it is hard.** The obvious approach is vision only, and it fails because occlusion in crowded aisles breaks vision-only. The second trap is in "Tracking": the real signal is person tracks via appearance and spatial continuity, while teams usually reach for face recognition.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $53.5K a month. A mistake is expensive in the way exception review rate measures it.

**What success looks like.** Offline: Basket-level exact match and Item-level precision and recall. Online: Billing disputes per 1000 baskets and Exception review rate. The launch is judged on "Billing disputes per 1000 baskets" while "Exception review rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Track shoppers and pick/put events with camera and weight sensors to produce accurate virtual baskets without checkout.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{reid}}+\mathcal{L}_{\text{action}}+\lambda\,\mathcal{L}_{\text{basket-consistency}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{reid}} | Re-identification loss: how well the same shopper is recognised across cameras. |
| \mathcal{L}_{\text{action}} | Action loss: how well picking up or putting back items is recognised. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{basket-consistency}} | Penalty when the inferred basket is inconsistent with the sequence of actions. |

**Hard constraints**

- Billing accuracy above 99.5%
- Privacy (no face ID)
- Real-time inside store
- Hardware cost per store

## The approach in one paragraph

Start with sensor-only smart shelves with manual app checkout. Then earn the move to multi-camera tracking with edge fusion of vision, weight and RFID, probabilistic basket reconstruction and exception review for low-confidence baskets, and only if it beats the baseline on Basket-level exact match and Item-level precision and recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Weight-delta match | Measured shelf weight change vs SKU weight. Disambiguates picks. Guard against: calibrated load cells. |
| Add Hand-item interaction score | Action recogniser output. Pick vs touch. Guard against: temporal context. |
| Add Track-merge confidence | Cross-camera ReID similarity. Basket assignment. Guard against: spatial constraints. |
| Run it as one pipeline | Camera streams (edge cluster), Person tracker (multi-camera ReID), Action recogniser (video transformer), Sensor fusion (Bayesian basket model), Basket validator (confidence rules) and Billing (payment service), with Exception review off the critical path. |
| Optimise the right thing | The objective weighs re-identification loss: how well the same shopper is recognised across cameras, so the model is trained on the cost of the decision and not on a generic score. |
| Handle crowded store at peak | Conservative merge thresholds and review of ambiguous baskets. |

**Deliberately not doing**

- Shopper clothing colour: changes and collides.
- Time-in-store: not a basket signal.

**How the approach is proven**

Prove it offline on Basket-level exact match and Item-level precision and recall using time-ordered splits, then online on "Billing disputes per 1000 baskets" with "Exception review rate" as the guardrail. Watch for: Training data from staged shoppers and Ignoring rare multi-shopper interactions.

## Baseline and production design

- **Baseline (build this first):** Sensor-only smart shelves with manual app checkout.
- **Production design:** Multi-camera tracking with edge fusion of vision, weight and RFID, probabilistic basket reconstruction and exception review for low-confidence baskets.

## Why AI, and why this kind

**Why AI.** Track shoppers and pick/put events with camera and weight sensors to produce accurate virtual baskets without checkout. The evidence that separates good from bad outcomes (Weight-delta match, Hand-item interaction score, Track-merge confidence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "vision only" are what teams reach for first, and they fail because occlusion in crowded aisles breaks vision-only. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multi-camera tracking with edge fusion of vision, weight and RFID, probabilistic basket reconstruction and exception review for low-confidence baskets.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Weight-delta match, Hand-item interaction score, Track-merge confidence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Sensor-only smart shelves with manual app checkout | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-camera tracking with edge fusion of vision, weight and RFID, probabilistic basket reconstruction and exception review for low-confidence baskets | chosen | Meets the 80 ms envelope at $59.40 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Billing disputes per 1000 baskets) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training data from staged shoppers.
- Evaluation trap: Ignoring rare multi-shopper interactions.
- Crowded store at peak: track swaps between shoppers.
- Sensor calibration drift: wrong item weights.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
