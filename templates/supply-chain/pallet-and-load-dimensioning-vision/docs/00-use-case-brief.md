# Pallet Dimensioning & Load Verification: use-case brief

> Generated from the blueprint `supply-chain/pallet-and-load-dimensioning-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pallet Dimensioning & Load Verification · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Measure dimensions, weight proxies and load shape from 3D cameras to verify freight declarations and optimise trailer space. The system has to run interactively, within a few seconds, inside these limits: Accuracy within 1 cm, Throughput on dock and Revenue dispute evidence.

**Why it is hard.** The obvious approach is rGB-only estimation, and it fails because rGB lacks scale. The second trap is in "Revenue": the real signal is dimension audit trail for billing, while teams usually reach for estimates without evidence.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $28.5K a month. A mistake is expensive in the way trailer cube utilisation measures it.

**What success looks like.** Offline: Dimension error distribution and Discrepancy flag precision. Online: Billing corrections captured and Trailer cube utilisation. The launch is judged on "Billing corrections captured" while "Trailer cube utilisation" must not get worse.

## Objective, loss and constraints

**Business objective.** Measure dimensions, weight proxies and load shape from 3D cameras to verify freight declarations and optimise trailer space.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\text{dims},\widehat{\text{dims}})+\lambda\,\mathrm{ShapeConsistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \text{dims} | The true length, width and height of the pallet. |
| \widehat{\text{dims}} | The model's estimate of the dimensions. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ShapeConsistency} | Penalty when the estimated dimensions describe an impossible shape. |

**Hard constraints**

- Accuracy within 1 cm
- Throughput on dock
- Revenue dispute evidence
- Calibration drift

## The approach in one paragraph

Start with manual tape measurements. Then earn the move to calibrated depth cameras with point-cloud segmentation, automatic calibration checks and a discrepancy-flagging service, and only if it beats the baseline on Dimension error distribution and Discrepancy flag precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Point-cloud bounding volume | Fitted box from fused cloud. Dimensions. Guard against: calibration. |
| Add Overhang and stacking stability | Geometric checks. Safety. Guard against: rules. |
| Add Declared vs measured discrepancy | Difference to declaration. Billing audit. Guard against: tolerance. |
| Run it as one pipeline | Depth cameras (dock), Calibration check (self-diagnosis), Segmentation and box fitting (point-cloud network), Discrepancy engine (rules), Billing update (TMS), Dock supervisor (human) and Dispute evidence (archive). |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle shrink-wrap reflections | Multi-view fusion and outlier removal. |

**Deliberately not doing**

- Pallet colour: none.
- Forklift operator: none.

**How the approach is proven**

Prove it offline on Dimension error distribution and Discrepancy flag precision using time-ordered splits, then online on "Billing corrections captured" with "Trailer cube utilisation" as the guardrail. Watch for: Test freight easier than real and Calibration done only once.

## Baseline and production design

- **Baseline (build this first):** Manual tape measurements.
- **Production design:** Calibrated depth cameras with point-cloud segmentation, automatic calibration checks and a discrepancy-flagging service.

## Why AI, and why this kind

**Why AI.** Measure dimensions, weight proxies and load shape from 3D cameras to verify freight declarations and optimise trailer space. The evidence that separates good from bad outcomes (Point-cloud bounding volume, Overhang and stacking stability, Declared vs measured discrepancy) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "RGB-only estimation" are what teams reach for first, and they fail because RGB lacks scale. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Calibrated depth cameras with point-cloud segmentation, automatic calibration checks and a discrepancy-flagging service.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Point-cloud bounding volume, Overhang and stacking stability, Declared vs measured discrepancy and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual tape measurements | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Calibrated depth cameras with point-cloud segmentation, automatic calibration checks and a discrepancy-flagging service | chosen | Meets the 2500 ms envelope at $3.17 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Billing corrections captured) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test freight easier than real.
- Evaluation trap: Calibration done only once.
- Shrink-wrap reflections: reflective wrap creates depth noise that corrupts the measured pallet dimensions.
- Camera drift after bump: systematic error.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
