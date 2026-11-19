# Listing Photo Quality & Room Classification: use-case brief

> Generated from the blueprint `real-estate/listing-photo-quality-and-room-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Listing Photo Quality & Room Classification · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent. The system has to run in under 100 milliseconds, inside these limits: Under 80 ms per image at the 99th percentile so upload is not slowed, Room type and quality are descriptions of the photo, never judgements of people or their homes and Faces and number plates blurred before any image is stored or shown.

**Why it is hard.** The obvious approach is the file name or the order of upload, and it fails because agents upload in arbitrary order, so position carries no information about the room. The second trap is in "Quality": the real signal is technical quality measured by blur, exposure and tilt, while teams usually reach for aesthetic opinions about taste.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $44.8K a month. A mistake is expensive in the way agent reshoot rate measures it.

**What success looks like.** Offline: Room accuracy and Quality rank correlation. Online: Listing engagement and Agent reshoot rate. The launch is judged on "Listing engagement" while "Agent reshoot rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{Ordinal}(\hat{q},q)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Ordinal} | An ordinal loss: penalises predictions by how far they fall from the true ordered grade. |
| \hat{q} | The model's predicted value at the chosen quantile. |
| q | Quantile level between 0 and 1, for example 0.9 for the 90th percentile. |

**Hard constraints**

- Under 80 ms per image at the 99th percentile so upload is not slowed
- Room type and quality are descriptions of the photo, never judgements of people or their homes
- Faces and number plates blurred before any image is stored or shown
- Equal accuracy across house, flat, rural and luxury listings

## The approach in one paragraph

Start with agent-ordered gallery with blur thresholds, because portals do this. Then earn the move to a multi-task vision model for room class and quality with ordering rules and privacy blur, and only if it beats the baseline on Room accuracy and Quality rank correlation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Room class probability | Softmax output of the vision model for each room type. Drives gallery ordering and flags missing rooms. Guard against: rare rooms such as utility or study are under-represented, so check per-class recall. |
| Add Blur score | Variance of the Laplacian of the grey image. Sharp images have strong edges, and a low value means a blurred photo. Guard against: depends on image size, so compute at a fixed resolution. |
| Add Exposure histogram | Share of pixels clipped in highlights and in shadows. Over or under-exposure is a fixable defect. Guard against: high-dynamic-range photos look clipped but are fine, so condition on the scene type. |
| Run it as one pipeline | Image upload (portal), Preprocessor (resize and hash), Room and quality model (vision model on GPU), Privacy blur (detector) and Gallery orderer (rules), with Agent feedback and Label feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle floor plans in the gallery | Add a floor-plan class and route it to the plan viewer. |

**Deliberately not doing**

- File size: Depends on compression settings and the upload client and says nothing about the scene.
- Camera brand: Irrelevant to the room or its quality once exposure and blur are measured.
- Upload time: Reflects when the agent worked, not the room or the image.

**How the approach is proven**

Prove it offline on Room accuracy and Quality rank correlation using time-ordered splits, then online on "Listing engagement" with "Agent reshoot rate" as the guardrail. Watch for: Training mostly on professional photos hides failures on the phone pictures that most agents upload and Quality labels from a few raters are noisy and cap how well the model can do.

## Baseline and production design

- **Baseline (build this first):** Agent-ordered gallery with blur thresholds, because portals do this.
- **Production design:** A multi-task vision model for room class and quality with ordering rules and privacy blur.

## Why AI, and why this kind

**Why AI.** Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent. The evidence that separates good from bad outcomes (Room class probability, Blur score, Exposure histogram) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the file name or the order of upload" are what teams reach for first, and they fail because agents upload in arbitrary order, so position carries no information about the room. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A multi-task vision model for room class and quality with ordering rules and privacy blur.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Room class probability, Blur score, Exposure histogram and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Agent-ordered gallery with blur thresholds, because portals do this | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multi-task vision model for room class and quality with ordering rules and privacy blur | chosen | Meets the 80 ms envelope at $0.498 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Listing engagement) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training mostly on professional photos hides failures on the phone pictures that most agents upload.
- Evaluation trap: Quality labels from a few raters are noisy and cap how well the model can do.
- Floor plans in the gallery: a floor plan in the gallery is classed as a room photo.
- Night shots: night shots are dark but valid and are scored as poor quality.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
