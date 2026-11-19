# Uplift Modelling for Campaigns: use-case brief

> Generated from the blueprint `adtech/uplift-modeling-campaign` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Uplift Modelling for Campaigns · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Target ads or offers only to users whose conversion probability rises because of the treatment, to maximise incremental conversions. The system has to run as a scheduled batch job, inside these limits: Randomised control required, Budget and Consent.

**Why it is hard.** The obvious approach is propensity targeting, and it fails because propensity targets sure things who convert anyway. The second trap is in "Evaluation": the real signal is qini and AUUC on randomised holdout, while teams usually reach for aUC of conversion.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.6K a month. A mistake is expensive in the way sleeping-dog rate measures it.

**What success looks like.** Offline: Qini coefficient and AUUC on holdout. Online: Incremental conversions per spend and Sleeping-dog rate. The launch is judged on "Incremental conversions per spend" while "Sleeping-dog rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Target ads or offers only to users whose conversion probability rises because of the treatment, to maximise incremental conversions.

**Training objective.** `\hat\tau(x)=\mu_1(x)-\mu_0(x),\quad\text{policy: treat if }\hat\tau(x)>c`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \hat{\tau} | The estimated treatment effect (uplift): how much the treatment changes the outcome for this unit or group. |
| x | The input features describing one example (what the model sees). |
| \mu_1 | Predicted outcome if the person is treated. |
| c | The cost of treating one person: treat only if the estimated uplift exceeds it. |

**Hard constraints**

- Randomised control required
- Budget
- Consent
- Fairness

## The approach in one paragraph

Start with target top conversion-propensity users. Then earn the move to causal forest or DR-learner with 10% randomised holdout and budget-constrained policy, and only if it beats the baseline on Qini coefficient and AUUC on holdout after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Treatment propensity (known) | Randomisation probability. IPW. Guard against: design. |
| Add Pre-treatment engagement | Activity before campaign. Heterogeneity. Guard against: window. |
| Add Prior campaign response | Response history. Persuadable signal. Guard against: exclude current. |
| Run it as one pipeline | User features (feature store), Randomised assignment (platform), Uplift model (DR-learner), Policy optimiser (budget solver), Audience activation (DSP) and Incremental measurement (holdout), with Marketing analyst off the critical path. |
| Optimise the right thing | The objective weighs the estimated treatment effect (uplift): how much the treatment changes the outcome for this unit or group, so the model is trained on the cost of the decision and not on a generic score. |
| Handle spillover between treated and control users | Cluster randomisation where interference exists. |

**Deliberately not doing**

- Post-treatment actions: collider bias.
- Campaign ID: none.

**How the approach is proven**

Prove it offline on Qini coefficient and AUUC on holdout using time-ordered splits, then online on "Incremental conversions per spend" with "Sleeping-dog rate" as the guardrail. Watch for: Training on non-randomised past targeting and Using conversion AUC for model choice.

## Baseline and production design

- **Baseline (build this first):** Target top conversion-propensity users.
- **Production design:** Causal forest or DR-learner with 10% randomised holdout and budget-constrained policy.

## Why AI, and why this kind

**Why AI.** Target ads or offers only to users whose conversion probability rises because of the treatment, to maximise incremental conversions. The evidence that separates good from bad outcomes (Treatment propensity (known), Pre-treatment engagement, Prior campaign response) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "propensity targeting" are what teams reach for first, and they fail because propensity targets sure things who convert anyway. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Causal forest or DR-learner with 10% randomised holdout and budget-constrained policy.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Treatment propensity (known), Pre-treatment engagement, Prior campaign response and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Target top conversion-propensity users | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Causal forest or DR-learner with 10% randomised holdout and budget-constrained policy | chosen | Meets the run-window envelope at $0.061 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incremental conversions per spend) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on non-randomised past targeting.
- Evaluation trap: Using conversion AUC for model choice.
- Spillover between treated and control users: uplift is underestimated.
- Treatment fatigue over time: the treatment effect decays as users tire of the ads, invalidating older estimates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
