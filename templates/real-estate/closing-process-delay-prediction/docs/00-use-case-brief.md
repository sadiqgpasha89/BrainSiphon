# Closing Process Delay Prediction: use-case brief

> Generated from the blueprint `real-estate/closing-process-delay-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Closing Process Delay Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which home purchases will miss their closing date and why, so agents and lenders chase the right items. The system has to run as a scheduled batch job, inside these limits: Scores refreshed daily with the latest transaction status, Each score shows the reasons behind it and Output is a worklist of items to chase and not just a number.

**Why it is hard.** The obvious approach is a delay probability alone, and it fails because actions differ by cause, so a number with no cause does not tell a coordinator what to do. The second trap is in "Stage": the real signal is the process stage the transaction is in, while teams usually reach for calendar time to closing.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way coordinator time measures it.

**What success looks like.** Offline: PR-AUC and Calibration. Online: On-time closings and Coordinator time. The launch is judged on "On-time closings" while "Coordinator time" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which home purchases will miss their closing date and why, so agents and lenders chase the right items.

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

- Scores refreshed daily with the latest transaction status
- Each score shows the reasons behind it
- Output is a worklist of items to chase and not just a number
- Personal and financial data limited to what the coordinator needs

## The approach in one paragraph

Start with checklists with due dates, because coordinators use them. Then earn the move to gradient boosting on stage features with reason codes and a coordinator worklist, and only if it beats the baseline on PR-AUC and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Outstanding conditions | Count of lender conditions not yet cleared. The more conditions open, the higher the delay risk. Guard against: counts vary by lender, so normalise by loan type. |
| Add Appraisal status | State of the appraisal: not ordered, ordered, received or disputed. Appraisal problems are a main cause of delay. Guard against: status updates come late, so use time since the last change. |
| Add Lender responsiveness | Median days the lender takes to respond to requests in the last 10 deals. A slow lender predicts a delayed closing. Guard against: small samples for smaller lenders. |
| Run it as one pipeline | Transaction data (platform), Feature builder (Spark), Delay model (boosting), Reasons (SHAP), Worklist (CRM), Outcome log (warehouse) and Monitor (dashboard). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rate lock expiry | Flag locks that expire before the closing date and prompt the lender. |

**Deliberately not doing**

- Buyer name: Personal data with no predictive value.
- Property photo: Appearance of the home does not affect the closing process.
- Agent: The agent's name captures habit and not the status of the deal.

**How the approach is proven**

Prove it offline on PR-AUC and Calibration using time-ordered splits, then online on "On-time closings" with "Coordinator time" as the guardrail. Watch for: Outcomes after action, because coordinators chase risky deals and thereby change the result and Seasonality, since volumes and delays differ by month.

## Baseline and production design

- **Baseline (build this first):** Checklists with due dates, because coordinators use them.
- **Production design:** Gradient boosting on stage features with reason codes and a coordinator worklist.

## Why AI, and why this kind

**Why AI.** Predict which home purchases will miss their closing date and why, so agents and lenders chase the right items. The evidence that separates good from bad outcomes (Outstanding conditions, Appraisal status, Lender responsiveness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A delay probability alone" are what teams reach for first, and they fail because actions differ by cause, so a number with no cause does not tell a coordinator what to do. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on stage features with reason codes and a coordinator worklist.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Outstanding conditions, Appraisal status, Lender responsiveness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Checklists with due dates, because coordinators use them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on stage features with reason codes and a coordinator worklist | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (On-time closings) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Outcomes after action, because coordinators chase risky deals and thereby change the result.
- Evaluation trap: Seasonality, since volumes and delays differ by month.
- Rate lock expiry: a rate lock expires before closing and adds cost.
- Appraisal gap: the appraisal comes in below the contract price.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
