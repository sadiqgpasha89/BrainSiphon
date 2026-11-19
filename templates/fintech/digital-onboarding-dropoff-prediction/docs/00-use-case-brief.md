# Digital Onboarding Drop-off Prediction & Intervention: use-case brief

> Generated from the blueprint `fintech/digital-onboarding-dropoff-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Digital Onboarding Drop-off Prediction & Intervention · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict mid-funnel abandonment during account opening and intervene (nudge, simplified step, assisted help) to lift completion. The system has to run in under 100 milliseconds, inside these limits: No pressure tactics, Consent for outreach and Decision under 80 ms per screen.

**Why it is hard.** The obvious approach is predicting abandonment only, and it fails because some abandoners cannot be saved and some stay anyway. The second trap is in "Friction": the real signal is step-level timing and error features, while teams usually reach for page-view counts.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $3.6K a month. A mistake is expensive in the way cost per activated account measures it.

**What success looks like.** Offline: Qini on randomised holdout and AUC of drop-off. Online: Completion rate and Cost per activated account. The launch is judged on "Completion rate" while "Cost per activated account" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict mid-funnel abandonment during account opening and intervene (nudge, simplified step, assisted help) to lift completion.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\;\text{and uplift: }\tau(x)=\mathbb{E}[Y(1)-Y(0)\mid x]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \tau | Uplift: the causal effect of an intervention on completing onboarding, for a user with features x. |
| x | The user's features. |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| Y | The outcome: Y(1) with the intervention and Y(0) without. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |

**Hard constraints**

- No pressure tactics
- Consent for outreach
- Decision under 80 ms per screen
- Privacy for partial applications

## The approach in one paragraph

Start with funnel analytics with rule triggers (idle 60s). Then earn the move to real-time GBDT scoring per step with uplift-based intervention selection and online experimentation, and only if it beats the baseline on Qini on randomised holdout and AUC of drop-off after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Step dwell time vs peers | Z-score of dwell on current step. Confusion marker. Guard against: peer baseline per device type. |
| Add Validation error count | Form errors encountered on this step. Friction direct measure. Guard against: count before the nudge. |
| Add Document capture retries | Retries on ID photo. Quality friction. Guard against: retry source (device vs lighting). |
| Run it as one pipeline | Client event stream (SDK), Session feature builder (Flink), Drop-off scorer (GBDT), Uplift selector (T-learner), Intervention API (nudge service), Experiment platform (A/B holdout) and Completion outcome (funnel logs). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle app release changes flow | Release-aware feature normalisation and rollback checks. |

**Deliberately not doing**

- Total session time: dominated by multitasking.
- Referrer URL: acquisition artefact.

**How the approach is proven**

Prove it offline on Qini on randomised holdout and AUC of drop-off using time-ordered splits, then online on "Completion rate" with "Cost per activated account" as the guardrail. Watch for: Intervention data from non-random triggers and Sessions with no outcome treated as dropped.

## Baseline and production design

- **Baseline (build this first):** Funnel analytics with rule triggers (idle 60s).
- **Production design:** Real-time GBDT scoring per step with uplift-based intervention selection and online experimentation.

## Why AI, and why this kind

**Why AI.** Predict mid-funnel abandonment during account opening and intervene (nudge, simplified step, assisted help) to lift completion. The evidence that separates good from bad outcomes (Step dwell time vs peers, Validation error count, Document capture retries) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "predicting abandonment only" are what teams reach for first, and they fail because some abandoners cannot be saved and some stay anyway. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Real-time GBDT scoring per step with uplift-based intervention selection and online experimentation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Step dwell time vs peers, Validation error count, Document capture retries and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Funnel analytics with rule triggers (idle 60s) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Real-time GBDT scoring per step with uplift-based intervention selection and online experimentation | chosen | Meets the 80 ms envelope at $0.199 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Completion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Intervention data from non-random triggers.
- Evaluation trap: Sessions with no outcome treated as dropped.
- App release changes flow: features shift instantly.
- Bot traffic: inflates drop-off.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
