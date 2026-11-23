# Call Reason Prediction: use-case brief

> Generated from the blueprint `telecom/call-reason-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Call Reason Prediction · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict why a customer is contacting care as they enter the queue so the right skill, content or self-service step is offered immediately. The system has to run in under 100 milliseconds, inside these limits: Prediction within 60 ms of the contact starting, Top three reasons shown to the agent and No sensitive inference such as health or religion.

**Why it is hard.** The obvious approach is menu choice at entry, and it fails because menu choices are guesses. The second trap is in "Recency": the real signal is events from the last few days, while teams usually reach for lifetime history.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $3.6K a month. A mistake is expensive in the way time to first correct skill measures it.

**What success looks like.** Offline: Top-one and top-three accuracy by reason, Calibration error and Latency at p99. Online: Transfers per contact, Time to first correct skill and Self-service resolution. The launch is judged on "Transfers per contact" while "Time to first correct skill" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict why a customer is contacting care as they enter the queue so the right skill, content or self-service step is offered immediately.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Prediction within 60 ms of the contact starting
- Top three reasons shown to the agent
- No sensitive inference such as health or religion
- Customer can always choose another reason

## The approach in one paragraph

Start with the most frequent reason for the customer's segment and the day of week, because it is a strong baseline for routing. Then earn the move to gradient boosting on event features with calibrated class probabilities and a fallback to the menu choice, served from a low-latency feature store, and only if it beats the baseline on Top-one and top-three accuracy by reason and Calibration error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Recent bill event | Days since the last bill and a bill change flag. Billing reasons. Guard against: as at contact time. |
| Add Open network incident near the customer | Whether a fault is open near their serving cells. Service reasons. Guard against: from live incidents. |
| Add Recent order or plan change | Order status and days since change. Activation and plan reasons. Guard against: from order management. |
| Run it as one pipeline | Contact start event (telephony platform), Feature fetch (online feature store), Reason model (gradient boosting), Calibration (temperature scaling), Routing and self-service hint (contact centre platform), Agent coding (wrap-up) and Retrain (weekly). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new product launch | Allow an other bucket and monitor its growth. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Language of the greeting: not the reason.
- Handset model alone: weak link.

**How the approach is proven**

Prove it offline on Top-one and top-three accuracy by reason, Calibration error and Latency at p99 using time-ordered splits, then online on "Transfers per contact" with "Time to first correct skill" as the guardrail. Watch for: Training on menu choices, Using lifetime history only and Forcing agents to follow the suggestion.

## Baseline and production design

- **Baseline (build this first):** The most frequent reason for the customer's segment and the day of week, because it is a strong baseline for routing.
- **Production design:** Gradient boosting on event features with calibrated class probabilities and a fallback to the menu choice, served from a low-latency feature store.

## Why AI, and why this kind

**Why AI.** Predict why a customer is contacting care as they enter the queue so the right skill, content or self-service step is offered immediately. The evidence that separates good from bad outcomes (Recent bill event, Open network incident near the customer, Recent order or plan change) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "menu choice at entry" are what teams reach for first, and they fail because menu choices are guesses. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on event features with calibrated class probabilities and a fallback to the menu choice, served from a low-latency feature store.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Recent bill event, Open network incident near the customer, Recent order or plan change and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The most frequent reason for the customer's segment and the day of week, because it is a strong baseline for routing | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on event features with calibrated class probabilities and a fallback to the menu choice, served from a low-latency feature store | chosen | Meets the 80 ms envelope at $0.200 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Transfers per contact) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on menu choices.
- Evaluation trap: Using lifetime history only.
- New product launch: new reasons appear.
- Outage day: one reason dominates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
