# Unauthorised Construction Detection from Imagery: use-case brief

> Generated from the blueprint `public-sector/unauthorised-construction-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Unauthorised Construction Detection from Imagery · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare aerial and satellite images over time to find new structures and changes that have no permit, and send the list to inspectors for verification. The system has to run as a scheduled batch job, inside these limits: Detections are leads for inspectors, No enforcement from a detection alone and Private homes handled under policy and law.

**Why it is hard.** The obvious approach is change detection alone, and it fails because seasonal change and demolition cause false alarms. The second trap is in "Action": the real signal is an inspection list with evidence, while teams usually reach for an automatic notice.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 347 at peak, at an estimated $197.7K a month. A mistake is expensive in the way inspector time per finding measures it.

**What success looks like.** Offline: Precision of verified leads, Recall on known cases and Coverage parity. Online: Unpermitted buildings found, Inspector time per finding and Wrongful notices. The launch is judged on "Unpermitted buildings found" while "Inspector time per finding" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare aerial and satellite images over time to find new structures and changes that have no permit, and send the list to inspectors for verification.

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

- Detections are leads for inspectors
- No enforcement from a detection alone
- Private homes handled under policy and law
- Parcel-level results with the images
- Annual coverage of 2,000 square km

## The approach in one paragraph

Start with inspections following resident complaints, because it is the current trigger. Then earn the move to a change detection model with permit matching and a parity check on coverage, producing a verified inspection list with the evidence images, and only if it beats the baseline on Precision of verified leads and Recall on known cases after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Building footprint change | New or enlarged footprints between dates. Core signal. Guard against: from imagery. |
| Add Permit match | Whether a permit exists for the parcel. Filter. Guard against: from the permit system. |
| Add Image quality and date gap | Resolution and time between images. Reliability. Guard against: from metadata. |
| Run it as one pipeline | Imagery intake (aerial and satellite providers), Alignment and change detection (vision model), Permit match (permit system join), Lead scoring (rules), Inspector verification (field app) and Result capture (case system), with Coverage parity review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle seasonal foliage | Season-aware models. |

**Deliberately not doing**

- Owner name: personal data.
- Neighbourhood name: a proxy.
- Image vendor: irrelevant.

**How the approach is proven**

Prove it offline on Precision of verified leads, Recall on known cases and Coverage parity using time-ordered splits, then online on "Unpermitted buildings found" with "Inspector time per finding" as the guardrail. Watch for: Automatic notices, Complaint-only triggers and Uneven coverage.

## Baseline and production design

- **Baseline (build this first):** Inspections following resident complaints, because it is the current trigger.
- **Production design:** A change detection model with permit matching and a parity check on coverage, producing a verified inspection list with the evidence images.

## Why AI, and why this kind

**Why AI.** Compare aerial and satellite images over time to find new structures and changes that have no permit, and send the list to inspectors for verification. The evidence that separates good from bad outcomes (Building footprint change, Permit match, Image quality and date gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "change detection alone" are what teams reach for first, and they fail because seasonal change and demolition cause false alarms. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A change detection model with permit matching and a parity check on coverage, producing a verified inspection list with the evidence images.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Building footprint change, Permit match, Image quality and date gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Inspections following resident complaints, because it is the current trigger | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A change detection model with permit matching and a parity check on coverage, producing a verified inspection list with the evidence images | chosen | Meets the run-window envelope at $0.220 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unpermitted buildings found) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic notices.
- Evaluation trap: Complaint-only triggers.
- Seasonal foliage: trees look like structures.
- Temporary structure: tents and containers appear briefly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
