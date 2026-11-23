# Weld Seam Inspection: use-case brief

> Generated from the blueprint `manufacturing/weld-seam-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Weld Seam Inspection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted. The system has to run interactively, within a few seconds, inside these limits: Weld judged within 5 s of completion, Escape rate under 0.2% for structural welds and Process signals stored with each weld.

**Why it is hard.** The obvious approach is visual operator judgement, and it fails because appearance does not always match strength. The second trap is in "Signals": the real signal is image features together with current and voltage curves, while teams usually reach for images alone.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $57.0K a month. A mistake is expensive in the way destructive tests needed measures it.

**What success looks like.** Offline: Recall on destructive-test failures, Escape rate by weld class and Calibration of the pass decision. Online: Rework per thousand welds, Destructive tests needed and Weld-related warranty claims. The launch is judged on "Rework per thousand welds" while "Destructive tests needed" must not get worse.

## Objective, loss and constraints

**Business objective.** Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted.

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

- Weld judged within 5 s of completion
- Escape rate under 0.2% for structural welds
- Process signals stored with each weld
- Destructive test results used to recalibrate monthly
- 40K welds per day

## The approach in one paragraph

Start with tolerance bands on current and voltage per weld programme, because they are the standard controls and the benchmark. Then earn the move to a multimodal model combining bead image features and process curves with a calibrated pass, rework or test-sample decision, plus a link to electrode wear counters, and only if it beats the baseline on Recall on destructive-test failures and Escape rate by weld class after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Bead geometry score | Width, height and continuity from the image. Visible defects. Guard against: camera calibration needed. |
| Add Current and voltage curve shape | Distance of the curve from a golden curve. Process deviation. Guard against: align by weld phase. |
| Add Electrode wear count | Welds since last tip dress. Quality decay. Guard against: from the controller. |
| Run it as one pipeline | Weld image and curve capture (weld controller), Curve alignment (signal processing), Bead feature model (vision model), Combined quality model (gradient boosting), Decision and routing (MES rules) and Model update (monthly retrain), with Test sample feedback off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle electrode wear | Wear count features and a tip dress trigger. |

**Deliberately not doing**

- Welder name: not a quality driver.
- Image resolution tweaks: an acquisition choice.
- Time of day alone: confounded with shift.

**How the approach is proven**

Prove it offline on Recall on destructive-test failures, Escape rate by weld class and Calibration of the pass decision using time-ordered splits, then online on "Rework per thousand welds" with "Destructive tests needed" as the guardrail. Watch for: Using visual judgement as strength labels, Ignoring wear and Sampling only easy parts.

## Baseline and production design

- **Baseline (build this first):** Tolerance bands on current and voltage per weld programme, because they are the standard controls and the benchmark.
- **Production design:** A multimodal model combining bead image features and process curves with a calibrated pass, rework or test-sample decision, plus a link to electrode wear counters.

## Why AI, and why this kind

**Why AI.** Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted. The evidence that separates good from bad outcomes (Bead geometry score, Current and voltage curve shape, Electrode wear count) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "visual operator judgement" are what teams reach for first, and they fail because appearance does not always match strength. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A multimodal model combining bead image features and process curves with a calibrated pass, rework or test-sample decision, plus a link to electrode wear counters.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Bead geometry score, Current and voltage curve shape, Electrode wear count and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Tolerance bands on current and voltage per weld programme, because they are the standard controls and the benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multimodal model combining bead image features and process curves with a calibrated pass, rework or test-sample decision, plus a link to electrode wear counters | chosen | Meets the 2500 ms envelope at $0.317 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Rework per thousand welds) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using visual judgement as strength labels.
- Evaluation trap: Ignoring wear.
- Electrode wear: quality drifts slowly.
- Unusual coating: new material changes the signal.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
