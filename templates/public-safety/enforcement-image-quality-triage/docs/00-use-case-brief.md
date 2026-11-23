# Traffic Enforcement Image Quality Triage: use-case brief

> Generated from the blueprint `public-safety/enforcement-image-quality-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Traffic Enforcement Image Quality Triage · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check the quality of images from speed and red-light cameras so unusable images are removed early and reviewers see clear evidence, with every violation decided by a trained reviewer. The system has to run as a scheduled batch job, inside these limits: The model never decides a violation, Unusable images are logged with the reason and Plates of non-violations are discarded on schedule.

**Why it is hard.** The obvious approach is a violation classifier, and it fails because penalties need a person and proof. The second trap is in "Privacy": the real signal is short retention and masking for non-violations, while teams usually reach for keeping all images.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $5.7K a month. A mistake is expensive in the way unusable images reviewed measures it.

**What success looks like.** Offline: Agreement with reviewers on usability, Reason code accuracy and Quality parity by site. Online: Reviewer time per valid case, Unusable images reviewed and Camera downtime. The launch is judged on "Reviewer time per valid case" while "Unusable images reviewed" must not get worse.

## Objective, loss and constraints

**Business objective.** Check the quality of images from speed and red-light cameras so unusable images are removed early and reviewers see clear evidence, with every violation decided by a trained reviewer.

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

- The model never decides a violation
- Unusable images are logged with the reason
- Plates of non-violations are discarded on schedule
- Reviewer sees the original image
- 2M images per month

## The approach in one paragraph

Start with reviewers opening every image and rejecting poor ones, because it is the current process. Then earn the move to a quality classifier that sorts images into usable, borderline and unusable with reasons, sends borderline images to a reviewer and drives camera maintenance tickets, and only if it beats the baseline on Agreement with reviewers on usability and Reason code accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Image sharpness and exposure | Blur, glare and exposure. Usability. Guard against: from the image. |
| Add Plate legibility | Readable plate region. Usability. Guard against: from the vision model. |
| Add Frame completeness | Vehicle, signal and marking visible. Evidence completeness. Guard against: from the vision model. |
| Run it as one pipeline | Image intake (enforcement cameras), Quality scoring (vision model), Reason coding (rules), Discard schedule (retention policy) and Camera maintenance ticket (asset system), with Reviewer queue and Site parity review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle night glare | Exposure flags and camera adjustments. |

**Deliberately not doing**

- Driver identity: personal data.
- Vehicle make alone: weak link.
- Time of day alone: weak link.

**How the approach is proven**

Prove it offline on Agreement with reviewers on usability, Reason code accuracy and Quality parity by site using time-ordered splits, then online on "Reviewer time per valid case" with "Unusable images reviewed" as the guardrail. Watch for: Automatic violation decisions, Long image retention and Single-site tuning.

## Baseline and production design

- **Baseline (build this first):** Reviewers opening every image and rejecting poor ones, because it is the current process.
- **Production design:** A quality classifier that sorts images into usable, borderline and unusable with reasons, sends borderline images to a reviewer and drives camera maintenance tickets.

## Why AI, and why this kind

**Why AI.** Check the quality of images from speed and red-light cameras so unusable images are removed early and reviewers see clear evidence, with every violation decided by a trained reviewer. The evidence that separates good from bad outcomes (Image sharpness and exposure, Plate legibility, Frame completeness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A violation classifier" are what teams reach for first, and they fail because penalties need a person and proof. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A quality classifier that sorts images into usable, borderline and unusable with reasons, sends borderline images to a reviewer and drives camera maintenance tickets.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Image sharpness and exposure, Plate legibility, Frame completeness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reviewers opening every image and rejecting poor ones, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A quality classifier that sorts images into usable, borderline and unusable with reasons, sends borderline images to a reviewer and drives camera maintenance tickets | chosen | Meets the run-window envelope at $0.063 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reviewer time per valid case) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic violation decisions.
- Evaluation trap: Long image retention.
- Night glare: headlights wash out the plate.
- Rain on lens: the image is blurred.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
