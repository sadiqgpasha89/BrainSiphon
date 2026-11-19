# Insurance Underwriting & Risk Pricing: use-case brief

> Generated from the blueprint `fintech/insurance-underwriting-risk-pricing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Insurance Underwriting & Risk Pricing · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Price policies at quote time so premiums match expected loss and competitor-aware conversion within regulatory rate rules. The system has to run in under 100 milliseconds, inside these limits: Rating factors must be filed with regulators, No prohibited attributes and Quote in 80 ms.

**Why it is hard.** The obvious approach is classification of claim yes/no, and it fails because ignoring exposure biases pricing for part-year policies. The second trap is in "Price": the real signal is loss cost plus demand elasticity optimisation, while teams usually reach for charging pure risk premium.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $3.6K a month. A mistake is expensive in the way conversion rate at target margin measures it.

**What success looks like.** Offline: Gini and lift by decile and Out-of-time Tweedie deviance. Online: Loss ratio by cohort and Conversion rate at target margin. The launch is judged on "Loss ratio by cohort" while "Conversion rate at target margin" must not get worse.

## Objective, loss and constraints

**Business objective.** Price policies at quote time so premiums match expected loss and competitor-aware conversion within regulatory rate rules.

**Training objective.** `\mathcal{L}=\mathrm{Deviance}_{\text{Tweedie}}(y,\hat\mu)=2\left[\frac{y^{2-p}}{(1-p)(2-p)}-\frac{y\hat\mu^{1-p}}{1-p}+\frac{\hat\mu^{2-p}}{2-p}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Deviance}_{\text{Tweedie}} | Deviance: a likelihood-based loss that measures how far predictions are from the observed outcomes. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \hat{\mu} | The model's estimated mean (expected value) of the outcome. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |

**Hard constraints**

- Rating factors must be filed with regulators
- No prohibited attributes
- Quote in 80 ms
- Rate changes need actuarial sign-off

## The approach in one paragraph

Start with gLM with filed rating factors. Then earn the move to gLM-GBM hybrid (GBM residual on GLM offset) distilled to a filed rating table, with elasticity-aware price optimisation, and only if it beats the baseline on Gini and lift by decile and Out-of-time Tweedie deviance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Exposure-adjusted claim frequency | Claims per policy-year by segment. Core pricing signal. Guard against: offset by earned exposure. |
| Add Vehicle or property risk class | Engineered class from make, model, construction. Severity driver. Guard against: use as-of rating tables. |
| Add Telematics or sensor score | Driving behaviour score from device. Behavioural risk. Guard against: consent and short observation windows. |
| Run it as one pipeline | Quote request (API), Rating-factor service (filed tables), Risk model (GBM on GLM offset), Price optimiser (elasticity model), Compliance check (filed-rate guard), Underwriter referral (exceptions) and Claims outcomes (development triangles). |
| Optimise the right thing | The objective weighs deviance: a likelihood-based loss that measures how far predictions are from the observed outcomes, so the model is trained on the cost of the decision and not on a generic score. |
| Handle claims development lag | IBNR adjustments and development-factor features. |

**Deliberately not doing**

- Customer first name: no risk information and proxy for demographics.
- Browser type: quote-funnel artefact.

**How the approach is proven**

Prove it offline on Gini and lift by decile and Out-of-time Tweedie deviance using time-ordered splits, then online on "Loss ratio by cohort" with "Conversion rate at target margin" as the guardrail. Watch for: Immature claims in training window and Rating factors not permitted in production slipped into features.

## Baseline and production design

- **Baseline (build this first):** GLM with filed rating factors.
- **Production design:** GLM-GBM hybrid (GBM residual on GLM offset) distilled to a filed rating table, with elasticity-aware price optimisation.

## Why AI, and why this kind

**Why AI.** Price policies at quote time so premiums match expected loss and competitor-aware conversion within regulatory rate rules. The evidence that separates good from bad outcomes (Exposure-adjusted claim frequency, Vehicle or property risk class, Telematics or sensor score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "classification of claim yes/no" are what teams reach for first, and they fail because ignoring exposure biases pricing for part-year policies. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: GLM-GBM hybrid (GBM residual on GLM offset) distilled to a filed rating table, with elasticity-aware price optimisation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Exposure-adjusted claim frequency, Vehicle or property risk class, Telematics or sensor score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: GLM with filed rating factors | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GLM-GBM hybrid (GBM residual on GLM offset) distilled to a filed rating table, with elasticity-aware price optimisation | chosen | Meets the 80 ms envelope at $1.99 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Loss ratio by cohort) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Immature claims in training window.
- Evaluation trap: Rating factors not permitted in production slipped into features.
- Claims development lag: recent cohorts look better than they are.
- Competitor rate cut: conversion collapses.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
