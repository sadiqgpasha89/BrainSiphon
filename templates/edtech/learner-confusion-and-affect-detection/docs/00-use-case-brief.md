# Learner Confusion & Affect Detection: use-case brief

> Generated from the blueprint `edtech/learner-confusion-and-affect-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Learner Confusion & Affect Detection · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Infer confusion, frustration and boredom from interaction signals (and optional consented video) to adapt help in real time. The system has to run in under 100 milliseconds, inside these limits: Privacy and consent (especially minors), Interaction-only default and Cross-cultural validity.

**Why it is hard.** The obvious approach is facial emotion recognition, and it fails because facial expressions are poor, biased proxies for learning states. The second trap is in "Labels": the real signal is teacher or self-report labels with noise handling, while teams usually reach for single-annotator labels.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $80.2K a month. A mistake is expensive in the way learning gain with adaptive support measures it.

**What success looks like.** Offline: Macro-F1 vs self-reports and Subgroup parity. Online: Help acceptance and Learning gain with adaptive support. The launch is judged on "Help acceptance" while "Learning gain with adaptive support" must not get worse.

## Objective, loss and constraints

**Business objective.** Infer confusion, frustration and boredom from interaction signals (and optional consented video) to adapt help in real time.

**Training objective.** `\mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Privacy and consent (especially minors)
- Interaction-only default
- Cross-cultural validity
- Low false alarms

## The approach in one paragraph

Start with teacher observation in class. Then earn the move to interaction-based sequence model with personal baselines, optional on-device consented video features and conservative intervention policy, and only if it beats the baseline on Macro-F1 vs self-reports and Subgroup parity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Response latency anomaly | Time vs personal baseline. Hesitation. Guard against: baseline. |
| Add Rapid-guessing flag | Answers faster than reading time. Disengagement. Guard against: timing. |
| Add Help-request pattern | Hint requests. Confusion. Guard against: event logs. |
| Run it as one pipeline | Interaction events (client), Baseline tracker (per-learner), Affect model (sequence model), Intervention policy (adaptive help) and Learner UI (hints), with Teacher view and Self-report labels off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle slow readers flagged as confused | Reading-speed normalisation. |

**Deliberately not doing**

- Facial action units alone: weak and biased.
- Mouse speed: device.

**How the approach is proven**

Prove it offline on Macro-F1 vs self-reports and Subgroup parity using time-ordered splits, then online on "Help acceptance" with "Learning gain with adaptive support" as the guardrail. Watch for: Labels from lab settings and Using faces without validation.

## Baseline and production design

- **Baseline (build this first):** Teacher observation in class.
- **Production design:** Interaction-based sequence model with personal baselines, optional on-device consented video features and conservative intervention policy.

## Why AI, and why this kind

**Why AI.** Infer confusion, frustration and boredom from interaction signals (and optional consented video) to adapt help in real time. The evidence that separates good from bad outcomes (Response latency anomaly, Rapid-guessing flag, Help-request pattern) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "facial emotion recognition" are what teams reach for first, and they fail because facial expressions are poor, biased proxies for learning states. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Interaction-based sequence model with personal baselines, optional on-device consented video features and conservative intervention policy.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Response latency anomaly, Rapid-guessing flag, Help-request pattern and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Teacher observation in class | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Interaction-based sequence model with personal baselines, optional on-device consented video features and conservative intervention policy | chosen | Meets the 80 ms envelope at $0.089 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Help acceptance) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from lab settings.
- Evaluation trap: Using faces without validation.
- Slow readers flagged as confused: unnecessary interruptions.
- Cultural differences in expression: biased predictions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
