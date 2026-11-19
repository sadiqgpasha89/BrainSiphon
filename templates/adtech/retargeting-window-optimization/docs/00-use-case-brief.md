# Retargeting Window & Churn Optimisation: use-case brief

> Generated from the blueprint `adtech/retargeting-window-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Retargeting Window & Churn Optimisation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide whether, when and how long to retarget each visitor to maximise incremental conversions and avoid chasing converted users. The system has to run in under 100 milliseconds, inside these limits: Suppress after conversion, Frequency limits and Consent.

**Why it is hard.** The obvious approach is fixed 30-day windows, and it fails because most conversions happen in the first days. The second trap is in "Incrementality": the real signal is incremental lift not last-touch, while teams usually reach for credit for organic converters.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $4.0K a month. A mistake is expensive in the way wasted impressions on converters measures it.

**What success looks like.** Offline: Hazard calibration and Incremental lift on holdout. Online: Incremental ROAS and Wasted impressions on converters. The launch is judged on "Incremental ROAS" while "Wasted impressions on converters" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide whether, when and how long to retarget each visitor to maximise incremental conversions and avoid chasing converted users.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{convert},p)\ \text{with hazard }h(t\mid x)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{convert} | The label: 1 if the visitor converts after the ad, 0 if not. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| h | The hazard: the chance of converting at time t given that they have not converted yet, which determines how long to keep retargeting. |
| t | Time step, or token position in a text sequence. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x | The input features describing one example (what the model sees). |

**Hard constraints**

- Suppress after conversion
- Frequency limits
- Consent
- Budget efficiency

## The approach in one paragraph

Start with retarget all visitors for 30 days. Then earn the move to survival-model-driven window per visitor with uplift filtering and real-time suppression lists, and only if it beats the baseline on Hazard calibration and Incremental lift on holdout after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Time since last visit | Hours since visit. Hazard. Guard against: clock. |
| Add Depth of engagement | Pages and cart adds. Intent. Guard against: window. |
| Add Prior conversion flag | Converted already. Suppression. Guard against: real-time. |
| Run it as one pipeline | Visit events (pixel), Visitor state (Redis), Hazard model (survival GBDT), Uplift filter (model), Suppression service (conversion feed), Bid service (DSP) and Conversions (postbacks). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle conversion postbacks delayed | Faster conversion signals and conservative decay. |

**Deliberately not doing**

- Visitor ID: none.
- Page URL: high-cardinality.

**How the approach is proven**

Prove it offline on Hazard calibration and Incremental lift on holdout using time-ordered splits, then online on "Incremental ROAS" with "Wasted impressions on converters" as the guardrail. Watch for: Observational lift inflated by selection and No holdout.

## Baseline and production design

- **Baseline (build this first):** Retarget all visitors for 30 days.
- **Production design:** Survival-model-driven window per visitor with uplift filtering and real-time suppression lists.

## Why AI, and why this kind

**Why AI.** Decide whether, when and how long to retarget each visitor to maximise incremental conversions and avoid chasing converted users. The evidence that separates good from bad outcomes (Time since last visit, Depth of engagement, Prior conversion flag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed 30-day windows" are what teams reach for first, and they fail because most conversions happen in the first days. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Survival-model-driven window per visitor with uplift filtering and real-time suppression lists.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Time since last visit, Depth of engagement, Prior conversion flag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Retarget all visitors for 30 days | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Survival-model-driven window per visitor with uplift filtering and real-time suppression lists | chosen | Meets the 80 ms envelope at $0.0044 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incremental ROAS) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Observational lift inflated by selection.
- Evaluation trap: No holdout.
- Conversion postbacks delayed: users converted yesterday still targeted.
- Cookie loss splits one visitor into several: frequency counts wrong.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
