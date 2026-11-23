# Demand Response Targeting: use-case brief

> Generated from the blueprint `energy/demand-response-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Demand Response Targeting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose which participating customers and sites to call during a peak event by estimated reduction per customer, so events deliver the needed load drop with the least inconvenience. The system has to run as a scheduled batch job, inside these limits: Only customers who opted in, Fatigue limits on events per customer and Reduction measured against a baseline.

**Why it is hard.** The obvious approach is total consumption, and it fails because high users do not always shift load. The second trap is in "Consent": the real signal is opt-in customers and their stated limits, while teams usually reach for any customer.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way event cost measures it.

**What success looks like.** Offline: Reduction forecast error, Target hit rate and Baseline bias on held-out events. Online: Delivered reduction, Event cost and Opt-out rate. The launch is judged on "Delivered reduction" while "Event cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose which participating customers and sites to call during a peak event by estimated reduction per customer, so events deliver the needed load drop with the least inconvenience.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Only customers who opted in
- Fatigue limits on events per customer
- Reduction measured against a baseline
- Event plan within 10 minutes
- 1M enrolled customers

## The approach in one paragraph

Start with calling all enrolled customers in the stressed area, because it is the simple programme design. Then earn the move to an uplift model of expected reduction per customer with fatigue constraints and an event planner that selects the cheapest set to meet the target with a margin, and only if it beats the baseline on Reduction forecast error and Target hit rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Past event response | Measured reduction in earlier events. Core signal. Guard against: baseline adjusted. |
| Add Load shape and flexible load | Share of load that is shiftable. Potential. Guard against: from interval data. |
| Add Weather and event timing | Temperature and event hour. Context. Guard against: from forecasts. |
| Run it as one pipeline | Enrolment and interval data (MDM and programme system), Baseline model (regression), Reduction model (uplift model), Event planner (constrained optimiser), Notification (customer channel), Reduction measurement (settlement) and Learning loop (after event). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle baseline error | Control groups and conservative baselines. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Marketing segment alone: weak link.
- Device brand: an artefact.

**How the approach is proven**

Prove it offline on Reduction forecast error, Target hit rate and Baseline bias on held-out events using time-ordered splits, then online on "Delivered reduction" with "Event cost" as the guardrail. Watch for: Using total consumption as the target, Repeating the same customers and Naive baselines.

## Baseline and production design

- **Baseline (build this first):** Calling all enrolled customers in the stressed area, because it is the simple programme design.
- **Production design:** An uplift model of expected reduction per customer with fatigue constraints and an event planner that selects the cheapest set to meet the target with a margin.

## Why AI, and why this kind

**Why AI.** Choose which participating customers and sites to call during a peak event by estimated reduction per customer, so events deliver the needed load drop with the least inconvenience. The evidence that separates good from bad outcomes (Past event response, Load shape and flexible load, Weather and event timing) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total consumption" are what teams reach for first, and they fail because high users do not always shift load. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: An uplift model of expected reduction per customer with fatigue constraints and an event planner that selects the cheapest set to meet the target with a margin.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Past event response, Load shape and flexible load, Weather and event timing and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Calling all enrolled customers in the stressed area, because it is the simple programme design | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An uplift model of expected reduction per customer with fatigue constraints and an event planner that selects the cheapest set to meet the target with a margin | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Delivered reduction) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using total consumption as the target.
- Evaluation trap: Repeating the same customers.
- Baseline error: the measured reduction is overstated.
- Heatwave overlap: weather shifts both load and response.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
