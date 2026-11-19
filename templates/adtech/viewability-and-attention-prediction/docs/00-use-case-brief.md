# Viewability & Attention Prediction: use-case brief

> Generated from the blueprint `adtech/viewability-and-attention-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Viewability & Attention Prediction · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict whether an ad impression will be viewable and attended to, to bid on quality inventory and verify delivery. The system has to run in under 100 milliseconds, inside these limits: Pre-bid prediction, MRC viewability standard and Publisher fairness.

**Why it is hard.** The obvious approach is custom definition, and it fails because mismatched definitions break billing. The second trap is in "Attention": the real signal is attention time beyond viewability, while teams usually reach for viewable binary.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $213.2K a month. A mistake is expensive in the way attention per dollar measures it.

**What success looks like.** Offline: Calibration vs measured viewability and Attention-time error. Online: Viewable CPM and Attention per dollar. The launch is judged on "Viewable CPM" while "Attention per dollar" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict whether an ad impression will be viewable and attended to, to bid on quality inventory and verify delivery.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{viewable},p)+\lambda\,\mathrm{Huber}(\text{attention time})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{viewable} | The label: 1 if the ad was viewable (on screen long enough), 0 if not. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \text{attention time} | How many seconds the user actually looked at the ad, predicted as a number. |

**Hard constraints**

- Pre-bid prediction
- MRC viewability standard
- Publisher fairness
- Privacy of sensors

## The approach in one paragraph

Start with block placements below a viewability threshold. Then earn the move to pre-bid viewability model on placement and page features, plus attention-time estimator calibrated on panel eye-tracking, and only if it beats the baseline on Calibration vs measured viewability and Attention-time error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Placement position and size | Slot geometry. Viewability. Guard against: context. |
| Add Page scroll depth distribution | Typical depth. Probability. Guard against: page-level. |
| Add Historical publisher viewability | Rate by placement. Prior. Guard against: window. |
| Run it as one pipeline | Bid request (exchange), Placement features (cache), Viewability model (GBDT), Attention estimator (model), Bid modifier (bidder), Measurement vendor (verification) and Calibration (panel). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle page layout changes after redesign | Layout-change detection and quick refresh. |

**Deliberately not doing**

- Ad ID: none.
- Creative size: weak.

**How the approach is proven**

Prove it offline on Calibration vs measured viewability and Attention-time error using time-ordered splits, then online on "Viewable CPM" with "Attention per dollar" as the guardrail. Watch for: Using publisher-reported viewability as truth and Panel not representative.

## Baseline and production design

- **Baseline (build this first):** Block placements below a viewability threshold.
- **Production design:** Pre-bid viewability model on placement and page features, plus attention-time estimator calibrated on panel eye-tracking.

## Why AI, and why this kind

**Why AI.** Predict whether an ad impression will be viewable and attended to, to bid on quality inventory and verify delivery. The evidence that separates good from bad outcomes (Placement position and size, Page scroll depth distribution, Historical publisher viewability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "custom definition" are what teams reach for first, and they fail because mismatched definitions break billing. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Pre-bid viewability model on placement and page features, plus attention-time estimator calibrated on panel eye-tracking.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Placement position and size, Page scroll depth distribution, Historical publisher viewability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Block placements below a viewability threshold | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Pre-bid viewability model on placement and page features, plus attention-time estimator calibrated on panel eye-tracking | chosen | Meets the 80 ms envelope at $0.079 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Viewable CPM) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using publisher-reported viewability as truth.
- Evaluation trap: Panel not representative.
- Page layout changes after redesign: stale predictions.
- Fraudulent viewability claims by publishers: inflated delivery.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
