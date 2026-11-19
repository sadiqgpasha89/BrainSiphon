# Remote Proctoring & Cheating Detection: use-case brief

> Generated from the blueprint `edtech/proctoring-cheating-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Remote Proctoring & Cheating Detection · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect suspicious behaviour during remote exams (second person, devices, impersonation) with human review of flagged segments, protecting privacy and fairness. The system has to run interactively, within a few seconds, inside these limits: Privacy and consent, Bias across skin tones and disabilities and Human review of all flags.

**Why it is hard.** The obvious approach is auto-fail on detection, and it fails because false flags harm students. The second trap is in "Fairness": the real signal is evaluate across skin tones, lighting and disabilities, while teams usually reach for overall accuracy.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $21.8K a month. A mistake is expensive in the way student complaint rate measures it.

**What success looks like.** Offline: Flag precision by subgroup and Review-time per flag. Online: Confirmed integrity violations and Student complaint rate. The launch is judged on "Confirmed integrity violations" while "Student complaint rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect suspicious behaviour during remote exams (second person, devices, impersonation) with human review of flagged segments, protecting privacy and fairness.

**Training objective.** `\mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_k | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per class or label k) |
| p_k | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per class or label k) |

**Hard constraints**

- Privacy and consent
- Bias across skin tones and disabilities
- Human review of all flags
- Bandwidth constraints

## The approach in one paragraph

Start with human live proctoring. Then earn the move to lightweight on-device detectors with server-side review prioritisation, accessibility accommodations and human adjudication, and only if it beats the baseline on Flag precision by subgroup and Review-time per flag after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Multiple-face detection | Additional person in frame. Collusion. Guard against: detector quality. |
| Add Gaze-away duration | Time looking off-screen. Weak cue. Guard against: disability confounds. |
| Add Prohibited-device detection | Phone or notes detection. Cheating tool. Guard against: object detector. |
| Run it as one pipeline | Webcam and screen feed (exam client), On-device detectors (face and object models), Flag aggregator (rules) and Decision and appeal (process), with Review prioritiser, Human proctor and Case outcomes off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle students with disabilities have atypical gaze or movement | Accommodation profiles and relaxed thresholds. |

**Deliberately not doing**

- Head movement alone: disabilities and habits.
- Eye blink rate: weak.

**How the approach is proven**

Prove it offline on Flag precision by subgroup and Review-time per flag using time-ordered splits, then online on "Confirmed integrity violations" with "Student complaint rate" as the guardrail. Watch for: Test set staged cheating and Ignoring subgroup false-positive rates.

## Baseline and production design

- **Baseline (build this first):** Human live proctoring.
- **Production design:** Lightweight on-device detectors with server-side review prioritisation, accessibility accommodations and human adjudication.

## Why AI, and why this kind

**Why AI.** Detect suspicious behaviour during remote exams (second person, devices, impersonation) with human review of flagged segments, protecting privacy and fairness. The evidence that separates good from bad outcomes (Multiple-face detection, Gaze-away duration, Prohibited-device detection) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "auto-fail on detection" are what teams reach for first, and they fail because false flags harm students. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Lightweight on-device detectors with server-side review prioritisation, accessibility accommodations and human adjudication.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Multiple-face detection, Gaze-away duration, Prohibited-device detection and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Human live proctoring | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Lightweight on-device detectors with server-side review prioritisation, accessibility accommodations and human adjudication | chosen | Meets the 2500 ms envelope at $4.85 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Confirmed integrity violations) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test set staged cheating.
- Evaluation trap: Ignoring subgroup false-positive rates.
- Students with disabilities have atypical gaze or movement: disproportionate flags.
- Poor bandwidth drops frames: missing evidence or false flags.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
