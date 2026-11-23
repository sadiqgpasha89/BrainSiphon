# Body-Worn Camera Footage Redaction Assistant: use-case brief

> Generated from the blueprint `public-safety/bodycam-footage-redaction-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Body-Worn Camera Footage Redaction Assistant · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest blurs for faces, plates, screens and bystander audio in footage prepared for release so staff review redactions faster and releases protect privacy. The system has to run as a scheduled batch job, inside these limits: Originals never modified, Staff review all suggested redactions and Every redaction is logged with its legal reason.

**Why it is hard.** The obvious approach is edited copies as the source, and it fails because courts need originals. The second trap is in "Role": the real signal is suggest and speed up review, while teams usually reach for fully automatic release.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $9.7K a month. A mistake is expensive in the way privacy incidents after release measures it.

**What success looks like.** Offline: Recall of faces and plates, Over-blur rate and Reviewer correction rate. Online: Review hours per released hour, Privacy incidents after release and Release turnaround. The launch is judged on "Review hours per released hour" while "Privacy incidents after release" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest blurs for faces, plates, screens and bystander audio in footage prepared for release so staff review redactions faster and releases protect privacy.

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

- Originals never modified
- Staff review all suggested redactions
- Every redaction is logged with its legal reason
- Release gate blocks unreviewed files
- 200K hours per year

## The approach in one paragraph

Start with editors blurring frame by frame in video tools, because it is the current process. Then earn the move to a tracking and detection pipeline that proposes blur regions across frames and audio mute segments in a review interface with reasons and a release gate, and only if it beats the baseline on Recall of faces and plates and Over-blur rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Face and plate detections | Detected regions. Redaction. Guard against: from vision. |
| Add Screen and document detection | Phones and screens in view. Redaction. Guard against: from vision. |
| Add Audio speaker segments | Bystander speech. Redaction. Guard against: from audio models. |
| Run it as one pipeline | Footage intake (evidence system), Hashing (integrity service), Detection and tracking (vision model), Audio segmentation (speech model) and Release gate (evidence system), with Reviewer redaction tool and Audit log off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle fast motion | Dense tracking and manual checks. |

**Deliberately not doing**

- Officer name: irrelevant.
- Camera serial: an identifier.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Recall of faces and plates, Over-blur rate and Reviewer correction rate using time-ordered splits, then online on "Review hours per released hour" with "Privacy incidents after release" as the guardrail. Watch for: Modifying originals, Automatic release and Redactions with no reason code.

## Baseline and production design

- **Baseline (build this first):** Editors blurring frame by frame in video tools, because it is the current process.
- **Production design:** A tracking and detection pipeline that proposes blur regions across frames and audio mute segments in a review interface with reasons and a release gate.

## Why AI, and why this kind

**Why AI.** Suggest blurs for faces, plates, screens and bystander audio in footage prepared for release so staff review redactions faster and releases protect privacy. The evidence that separates good from bad outcomes (Face and plate detections, Screen and document detection, Audio speaker segments) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "edited copies as the source" are what teams reach for first, and they fail because courts need originals. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A tracking and detection pipeline that proposes blur regions across frames and audio mute segments in a review interface with reasons and a release gate.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Face and plate detections, Screen and document detection, Audio speaker segments and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Editors blurring frame by frame in video tools, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A tracking and detection pipeline that proposes blur regions across frames and audio mute segments in a review interface with reasons and a release gate | chosen | Meets the run-window envelope at $0.054 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review hours per released hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Modifying originals.
- Evaluation trap: Automatic release.
- Fast motion: blurs lose the face.
- Reflections: faces appear in mirrors and windows.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
