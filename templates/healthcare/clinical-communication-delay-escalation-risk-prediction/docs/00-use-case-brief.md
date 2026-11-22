# Clinical Communication Delay & Escalation Risk Prediction: use-case brief

> Generated from the blueprint `healthcare/clinical-communication-delay-escalation-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Communication Delay & Escalation Risk Prediction · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model. The system has to run interactively, within a few seconds, inside these limits: Urgent messages follow deterministic escalation timers and the model can only add earlier escalation, The operational escalation owner manages alerts and no message is withheld or reordered by the score and Alerts are rate limited per owner and show their reasons.

**Why it is hard.** The obvious approach is model-controlled escalation, and it fails because an urgent message cannot wait for a score. The second trap is in "Outcome": the real signal is time to acknowledgement with censoring, while teams usually reach for binary late flag.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $3.6K a month. A mistake is expensive in the way time to acknowledgement measures it.

**What success looks like.** Offline: Concordance index and time-dependent AUC at 15 and 60 minutes, Calibration of delay probabilities and Alerts per owner per shift and the share acted on. Online: Messages meeting their service level, Time to acknowledgement and Late escalations avoided. The launch is judged on "Messages meeting their service level" while "Time to acknowledgement" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model.

**Training objective.** `\mathcal{L}=-\sum_i w_i\,[\,y_i\log p_i+(1-y_i)\log(1-p_i)\,]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- Urgent messages follow deterministic escalation timers and the model can only add earlier escalation
- The operational escalation owner manages alerts and no message is withheld or reordered by the score
- Alerts are rate limited per owner and show their reasons
- Predictions are by queue and role and not a measure of individual staff performance
- Scores messages continuously within 500 ms

## The approach in one paragraph

Start with a fixed escalation timer applies to every message of the same urgency. Then earn the move to a discrete-time survival model and queue analytics over streaming message events that estimate time to response, with deterministic urgent timers as overrides and a rate-limited escalation trigger for the operational owner, and only if it beats the baseline on Concordance index and time-dependent AUC at 15 and 60 minutes and Calibration of delay probabilities after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Queue depth and arrival rate | Open messages and recent arrivals in the target queue. Direct load signal. Guard against: event stream. |
| Add Role availability | On-shift staff in the target role. Capacity to respond. Guard against: roster snapshot. |
| Add Urgency and channel | Category and channel of the message. Different response norms. Guard against: message metadata. |
| Run it as one pipeline | Message event intake (streaming platform), Response-time survival model (discrete-time survival), Urgent timer override (deterministic rules) and Alert limiter and explainer (policy rules), with Queue and roster features, Escalation owner review and Outcome and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle shift change | Roster events in the features. |

**Deliberately not doing**

- Message length: not delay.
- Sender identity: not a delay driver.
- Message wording alone: covered by urgency.

**How the approach is proven**

Prove it offline on Concordance index and time-dependent AUC at 15 and 60 minutes, Calibration of delay probabilities and Alerts per owner per shift and the share acted on using time-ordered splits, then online on "Messages meeting their service level" with "Time to acknowledgement" as the guardrail. Watch for: Letting the score replace urgent timers, Scoring individual staff and Alerting on every high score.

## Baseline and production design

- **Baseline (build this first):** A fixed escalation timer applies to every message of the same urgency.
- **Production design:** A discrete-time survival model and queue analytics over streaming message events that estimate time to response, with deterministic urgent timers as overrides and a rate-limited escalation trigger for the operational owner.

## Why AI, and why this kind

**Why AI.** Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model. The evidence that separates good from bad outcomes (Queue depth and arrival rate, Role availability, Urgency and channel) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model-controlled escalation" are what teams reach for first, and they fail because an urgent message cannot wait for a score. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A discrete-time survival model and queue analytics over streaming message events that estimate time to response, with deterministic urgent timers as overrides and a rate-limited escalation trigger for the operational owner.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Queue depth and arrival rate, Role availability, Urgency and channel and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A fixed escalation timer applies to every message of the same urgency | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A discrete-time survival model and queue analytics over streaming message events that estimate time to response, with deterministic urgent timers as overrides and a rate-limited escalation trigger for the operational owner | chosen | Meets the 2500 ms envelope at $0.794 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Messages meeting their service level) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the score replace urgent timers.
- Evaluation trap: Scoring individual staff.
- Shift change: availability drops suddenly.
- Platform outage: events are missing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
