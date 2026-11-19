# Patient Digital Twin for Treatment Response: use-case brief

> Generated from the blueprint `healthcare/patient-digital-twin-treatment-response` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Digital Twin for Treatment Response · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Simulate individual patient trajectories under alternative treatments using causal models to support shared decision making. The system has to run as a scheduled batch job, inside these limits: Causal validity, Uncertainty communicated and Clinician-in-the-loop.

**Why it is hard.** The obvious approach is predicting outcomes under observed treatment, and it fails because treatment assignment is confounded by indication. The second trap is in "Validation": the real signal is compare with randomised trial effect estimates, while teams usually reach for fit on retrospective data only.

**Scale and stakes.** At 10 million users this is about 3.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way patient outcomes in pilot measures it.

**What success looks like.** Offline: Calibration vs RCT subgroup effects and Policy value via doubly robust estimation. Online: Clinician use and agreement and Patient outcomes in pilot. The launch is judged on "Clinician use and agreement" while "Patient outcomes in pilot" must not get worse.

## Objective, loss and constraints

**Business objective.** Simulate individual patient trajectories under alternative treatments using causal models to support shared decision making.

**Training objective.** `\mathcal{L}=-\log p(Y^{(a)}\mid X)\ \text{with balancing penalty }\mathrm{IPM}(\Phi(X)_{a=0},\Phi(X)_{a=1})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| Y^{(a)} | The outcome the patient would have under treatment a: Y^(a). |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| X | The patient's features. |
| \mathrm{IPM} | A distance between the treated and control distributions, used to reduce selection bias. |
| \Phi | The learned representation of the patient's features; the IPM term makes treated and control groups look alike in this space. |
| a | The treatment given: a=0 for control and a=1 for treated. |

**Hard constraints**

- Causal validity
- Uncertainty communicated
- Clinician-in-the-loop
- Regulatory and ethical review

## The approach in one paragraph

Start with population-average treatment effects from trials. Then earn the move to counterfactual sequence model (CRN/Causal Transformer) trained with balancing, calibrated uncertainty and trial-anchored validation, and only if it beats the baseline on Calibration vs RCT subgroup effects and Policy value via doubly robust estimation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pre-treatment covariate balance | Propensity overlap diagnostics. Identifiability. Guard against: overlap assumption. |
| Add Biomarker trajectory pre-treatment | Longitudinal lab trends. Heterogeneity. Guard against: index date. |
| Add Treatment history sequence | Prior therapies. Response context. Guard against: order. |
| Run it as one pipeline | Longitudinal EHR (OMOP), Cohort builder (target-trial emulation), Causal sequence model (counterfactual transformer), Uncertainty module (ensembles), Decision-support view (clinician UI) and Outcome tracking (registry), with Tumour board or clinician off the critical path. |
| Optimise the right thing | The objective weighs natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily, so the model is trained on the cost of the decision and not on a generic score. |
| Handle hidden confounders | Sensitivity analyses and trial anchoring. |

**Deliberately not doing**

- Post-treatment events: mediators and colliders.
- Hospital branding: none.

**How the approach is proven**

Prove it offline on Calibration vs RCT subgroup effects and Policy value via doubly robust estimation using time-ordered splits, then online on "Clinician use and agreement" with "Patient outcomes in pilot" as the guardrail. Watch for: Training on treated patients only and Using post-treatment variables as features.

## Baseline and production design

- **Baseline (build this first):** Population-average treatment effects from trials.
- **Production design:** Counterfactual sequence model (CRN/Causal Transformer) trained with balancing, calibrated uncertainty and trial-anchored validation.

## Why AI, and why this kind

**Why AI.** Simulate individual patient trajectories under alternative treatments using causal models to support shared decision making. The evidence that separates good from bad outcomes (Pre-treatment covariate balance, Biomarker trajectory pre-treatment, Treatment history sequence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "predicting outcomes under observed treatment" are what teams reach for first, and they fail because treatment assignment is confounded by indication. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Counterfactual sequence model (CRN/Causal Transformer) trained with balancing, calibrated uncertainty and trial-anchored validation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pre-treatment covariate balance, Biomarker trajectory pre-treatment, Treatment history sequence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Population-average treatment effects from trials | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Counterfactual sequence model (CRN/Causal Transformer) trained with balancing, calibrated uncertainty and trial-anchored validation | chosen | Meets the run-window envelope at $17.96 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Clinician use and agreement) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on treated patients only.
- Evaluation trap: Using post-treatment variables as features.
- Hidden confounders: biased individual effects.
- Treatment not seen for similar patients: the model extrapolates outcomes for treatments with no comparable patients in the data.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
