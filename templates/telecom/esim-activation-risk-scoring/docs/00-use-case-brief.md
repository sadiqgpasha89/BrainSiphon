# eSIM Activation Risk Scoring: use-case brief

> Generated from the blueprint `telecom/esim-activation-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** eSIM Activation Risk Scoring · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score eSIM and SIM-swap activation requests for takeover risk in real time so genuine customers are served quickly and risky activations get step-up verification. The system has to run in under 100 milliseconds, inside these limits: Decision within 60 ms of the request, False step-up rate under 2% of genuine requests and Step-up methods accessible to all customers.

**Why it is hard.** The obvious approach is customers who failed verification, and it fails because failed checks include genuine mistakes. The second trap is in "Action": the real signal is step-up verification for medium risk and a hold for high risk, while teams usually reach for block or allow only.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $3.6K a month. A mistake is expensive in the way genuine customers stepped up measures it.

**What success looks like.** Offline: Recall at fixed false step-up rate, Calibration by segment and Latency at p99. Online: Takeover losses, Genuine customers stepped up and Activation completion rate. The launch is judged on "Takeover losses" while "Genuine customers stepped up" must not get worse.

## Objective, loss and constraints

**Business objective.** Score eSIM and SIM-swap activation requests for takeover risk in real time so genuine customers are served quickly and risky activations get step-up verification.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Decision within 60 ms of the request
- False step-up rate under 2% of genuine requests
- Step-up methods accessible to all customers
- No decision on protected attributes
- 200K requests per day with spikes after launches

## The approach in one paragraph

Start with rules on recent credential changes and request velocity, because they catch common patterns and are easy to explain. Then earn the move to gradient boosting scored from an online feature store with calibrated probability and tiered actions, plus a case queue for held activations and a feedback loop from takeover reports, and only if it beats the baseline on Recall at fixed false step-up rate and Calibration by segment after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Recent credential or contact changes | Password, email or phone changes in the last 7 days. Takeover precursor. Guard against: from identity events. |
| Add Device and location mismatch | Device age and location distance from the usual. Possible attacker. Guard against: use coarse location. |
| Add Request velocity | Requests on the account and device in an hour. Automated attack. Guard against: per account and per device. |
| Run it as one pipeline | Activation request (digital channel), Feature fetch (online feature store), Risk model (gradient boosting), Policy tiers (rule engine), Step-up or hold (verification service) and Outcome labels (weekly join), with Case review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle genuine device upgrade | Use the customer's own device history and a smooth step-up. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Handset brand alone: weak link.
- Request time alone: weak link.

**How the approach is proven**

Prove it offline on Recall at fixed false step-up rate, Calibration by segment and Latency at p99 using time-ordered splits, then online on "Takeover losses" with "Genuine customers stepped up" as the guardrail. Watch for: Counting verification failures as fraud, Blocking without a path to prove identity and Training on post-hoc signals.

## Baseline and production design

- **Baseline (build this first):** Rules on recent credential changes and request velocity, because they catch common patterns and are easy to explain.
- **Production design:** Gradient boosting scored from an online feature store with calibrated probability and tiered actions, plus a case queue for held activations and a feedback loop from takeover reports.

## Why AI, and why this kind

**Why AI.** Score eSIM and SIM-swap activation requests for takeover risk in real time so genuine customers are served quickly and risky activations get step-up verification. The evidence that separates good from bad outcomes (Recent credential or contact changes, Device and location mismatch, Request velocity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "customers who failed verification" are what teams reach for first, and they fail because failed checks include genuine mistakes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting scored from an online feature store with calibrated probability and tiered actions, plus a case queue for held activations and a feedback loop from takeover reports.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Recent credential or contact changes, Device and location mismatch, Request velocity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules on recent credential changes and request velocity, because they catch common patterns and are easy to explain | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting scored from an online feature store with calibrated probability and tiered actions, plus a case queue for held activations and a feedback loop from takeover reports | chosen | Meets the 80 ms envelope at $0.796 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Takeover losses) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting verification failures as fraud.
- Evaluation trap: Blocking without a path to prove identity.
- Genuine device upgrade: many new device signals.
- Attack wave: new pattern appears.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
