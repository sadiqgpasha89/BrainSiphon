# Proof-of-Delivery Photo Verification: use-case brief

> Generated from the blueprint `supply-chain/proof-of-delivery-photo-verification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Proof-of-Delivery Photo Verification · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Verify delivery photos (parcel at door, correct location, no sensitive content) to prevent fraud and disputes. The system has to run interactively, within a few seconds, inside these limits: Fast feedback to driver, Privacy of homes and people and Duplicate photo detection.

**Why it is hard.** The obvious approach is visual plausibility alone, and it fails because fraudulent drivers reuse photos. The second trap is in "Privacy": the real signal is blur faces and sensitive details at capture, while teams usually reach for storing raw images.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $42.9K a month. A mistake is expensive in the way driver rework rate measures it.

**What success looks like.** Offline: Fraud detection recall and False rejection of genuine PODs. Online: Not-received claims and Driver rework rate. The launch is judged on "Not-received claims" while "Driver rework rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Verify delivery photos (parcel at door, correct location, no sensitive content) to prevent fraud and disputes.

**Training objective.** `\mathcal{L}=\mathrm{BCE}+\lambda\,\mathrm{Contrastive}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Contrastive} | Contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space. |

**Hard constraints**

- Fast feedback to driver
- Privacy of homes and people
- Duplicate photo detection
- Offline capture

## The approach in one paragraph

Start with driver self-reported POD with signature. Then earn the move to on-device quality and privacy filters with server-side authenticity checks (hash, geotag, parcel detection), and only if it beats the baseline on Fraud detection recall and False rejection of genuine PODs after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Parcel-in-scene detection | Parcel detected near door. Delivery evidence. Guard against: detector. |
| Add Photo reuse similarity | Perceptual hash vs recent photos. Fraud. Guard against: window. |
| Add Geotag distance to address | Distance between photo location and address. Location proof. Guard against: gPS accuracy. |
| Run it as one pipeline | Driver app capture (mobile), On-device privacy blur (edge model), Quality gate (blur check), Authenticity checks (hash and geotag), Parcel detector (small CNN), Dispute handling (human) and Outcome labels (customer claims). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle poor lighting at night | Low-light enhancement and relaxed thresholds. |

**Deliberately not doing**

- Photo brightness: environment.
- Phone model: device.

**How the approach is proven**

Prove it offline on Fraud detection recall and False rejection of genuine PODs using time-ordered splits, then online on "Not-received claims" with "Driver rework rate" as the guardrail. Watch for: Synthetic fraud unlike real and Test photos from daytime only.

## Baseline and production design

- **Baseline (build this first):** Driver self-reported POD with signature.
- **Production design:** On-device quality and privacy filters with server-side authenticity checks (hash, geotag, parcel detection).

## Why AI, and why this kind

**Why AI.** Verify delivery photos (parcel at door, correct location, no sensitive content) to prevent fraud and disputes. The evidence that separates good from bad outcomes (Parcel-in-scene detection, Photo reuse similarity, Geotag distance to address) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "visual plausibility alone" are what teams reach for first, and they fail because fraudulent drivers reuse photos. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: On-device quality and privacy filters with server-side authenticity checks (hash, geotag, parcel detection).

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Parcel-in-scene detection, Photo reuse similarity, Geotag distance to address and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Driver self-reported POD with signature | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| On-device quality and privacy filters with server-side authenticity checks (hash, geotag, parcel detection) | chosen | Meets the 2500 ms envelope at $0.954 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Not-received claims) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Synthetic fraud unlike real.
- Evaluation trap: Test photos from daytime only.
- Poor lighting at night: rejected genuine photos.
- Apartments with no clear door: parcel not visible.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
