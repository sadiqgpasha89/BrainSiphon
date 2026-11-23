# Bill Shock Prediction & Alerts: use-case brief

> Generated from the blueprint `telecom/bill-shock-prediction-alerts` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bill Shock Prediction & Alerts · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict customers likely to receive an unexpectedly high bill and alert them with a way to adjust, so disputes and complaints fall. The system has to run as a scheduled batch job, inside these limits: Alerts only through the customer's chosen channel, Alert cadence capped and No pressure to buy a higher plan.

**Why it is hard.** The obvious approach is any bill above average, and it fails because high bills are often expected. The second trap is in "Expectation": the real signal is charges compared with the customer's own history, while teams usually reach for compared with the population.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way complaints about charges measures it.

**What success looks like.** Offline: Precision and recall of shock bills, Calibration and Alert actionability rating. Online: Bill disputes, Complaints about charges and Opt-outs from alerts. The launch is judged on "Bill disputes" while "Complaints about charges" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict customers likely to receive an unexpectedly high bill and alert them with a way to adjust, so disputes and complaints fall.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Alerts only through the customer's chosen channel
- Alert cadence capped
- No pressure to buy a higher plan
- Daily scoring of 30M customers

## The approach in one paragraph

Start with alert when usage reaches fixed shares of the allowance, because it is the regulatory baseline in many markets. Then earn the move to gradient boosting on cycle-to-date usage and history that predicts an out-of-pattern bill with calibrated risk, plus a message with the cause and the easiest fix, and only if it beats the baseline on Precision and recall of shock bills and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Usage to date versus history | Usage so far in the cycle against the same point in prior cycles. Early warning. Guard against: align by cycle day. |
| Add Roaming and premium usage | Charges outside the plan. Common shock source. Guard against: rated near real time. |
| Add Plan allowance remaining | Allowance left against the projected usage. Overage risk. Guard against: per service. |
| Run it as one pipeline | Usage feed (rating stream), Cycle-to-date features (batch), Shock model (gradient boosting), Alert rules and caps (policy engine), Message with cause (messaging), Customer response capture (analytics) and Dispute join (weekly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle customer on holiday | Roaming alerts at first foreign use. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Payment method alone: weak link.
- Device brand alone: weak link.

**How the approach is proven**

Prove it offline on Precision and recall of shock bills, Calibration and Alert actionability rating using time-ordered splits, then online on "Bill disputes" with "Complaints about charges" as the guardrail. Watch for: Using population averages, Sales framing and No frequency cap.

## Baseline and production design

- **Baseline (build this first):** Alert when usage reaches fixed shares of the allowance, because it is the regulatory baseline in many markets.
- **Production design:** Gradient boosting on cycle-to-date usage and history that predicts an out-of-pattern bill with calibrated risk, plus a message with the cause and the easiest fix.

## Why AI, and why this kind

**Why AI.** Predict customers likely to receive an unexpectedly high bill and alert them with a way to adjust, so disputes and complaints fall. The evidence that separates good from bad outcomes (Usage to date versus history, Roaming and premium usage, Plan allowance remaining) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any bill above average" are what teams reach for first, and they fail because high bills are often expected. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on cycle-to-date usage and history that predicts an out-of-pattern bill with calibrated risk, plus a message with the cause and the easiest fix.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Usage to date versus history, Roaming and premium usage, Plan allowance remaining and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Alert when usage reaches fixed shares of the allowance, because it is the regulatory baseline in many markets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on cycle-to-date usage and history that predicts an out-of-pattern bill with calibrated risk, plus a message with the cause and the easiest fix | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bill disputes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using population averages.
- Evaluation trap: Sales framing.
- Customer on holiday: roaming appears suddenly.
- Alert fatigue: too many messages.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
