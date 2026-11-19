# Product-Led Growth Activation Prediction: use-case brief

> Generated from the blueprint `saas/plg-activation-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Product-Led Growth Activation Prediction · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which new signups will activate and convert to paid, and trigger in-product guidance or sales assist for those on the edge. The system has to run in under 100 milliseconds, inside these limits: Real-time within sessions, Privacy and Low-friction nudges.

**Why it is hard.** The obvious approach is signup counts, and it fails because signups without value moments never convert. The second trap is in "Nudges": the real signal is uplift per nudge type, while teams usually reach for nudging everyone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.6K a month. A mistake is expensive in the way free-to-paid conversion measures it.

**What success looks like.** Offline: AUC and uplift (Qini) and Calibration. Online: Activation rate and Free-to-paid conversion. The launch is judged on "Activation rate" while "Free-to-paid conversion" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which new signups will activate and convert to paid, and trigger in-product guidance or sales assist for those on the edge.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\ \text{and uplift }\tau(x)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \tau | Uplift: the causal effect of an intervention on activation for a user with features x. |
| x | The user's features. |

**Hard constraints**

- Real-time within sessions
- Privacy
- Low-friction nudges
- Experimentation

## The approach in one paragraph

Start with rule-based onboarding checklist emails. Then earn the move to real-time propensity model with uplift-based selection of onboarding nudges and sales-assist triggers, and only if it beats the baseline on AUC and uplift (Qini) and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Key-action completion in first session | Whether the aha action occurred. Activation. Guard against: event definitions. |
| Add Time-to-first-value | Minutes to first key action. Friction. Guard against: timing. |
| Add Team invitations sent | Collaborators invited. Network value. Guard against: event. |
| Run it as one pipeline | In-product events (SDK), Session features (Flink), Activation scorer (GBDT), Uplift selector (T-learner), Nudge service (in-app messaging), Experiment platform (A/B) and Conversion outcomes (warehouse). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle instrumentation change breaks the activation event | Event-contract tests and activation-rate monitors. |

**Deliberately not doing**

- Signup source text: channel artefact.
- Browser: weak.

**How the approach is proven**

Prove it offline on AUC and uplift (Qini) and Calibration using time-ordered splits, then online on "Activation rate" with "Free-to-paid conversion" as the guardrail. Watch for: Non-random nudge assignments in training and Using events after the activation moment.

## Baseline and production design

- **Baseline (build this first):** Rule-based onboarding checklist emails.
- **Production design:** Real-time propensity model with uplift-based selection of onboarding nudges and sales-assist triggers.

## Why AI, and why this kind

**Why AI.** Predict which new signups will activate and convert to paid, and trigger in-product guidance or sales assist for those on the edge. The evidence that separates good from bad outcomes (Key-action completion in first session, Time-to-first-value, Team invitations sent) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "signup counts" are what teams reach for first, and they fail because signups without value moments never convert. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Real-time propensity model with uplift-based selection of onboarding nudges and sales-assist triggers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Key-action completion in first session, Time-to-first-value, Team invitations sent and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based onboarding checklist emails | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Real-time propensity model with uplift-based selection of onboarding nudges and sales-assist triggers | chosen | Meets the 80 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Activation rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Non-random nudge assignments in training.
- Evaluation trap: Using events after the activation moment.
- Instrumentation change breaks the activation event: model sees zero activations.
- Nudge fatigue: users ignore all prompts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
