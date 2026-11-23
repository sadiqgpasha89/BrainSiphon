# Bill Shock Prediction: use-case brief

> Generated from the blueprint `energy/bill-shock-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bill Shock Prediction · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which customers are heading for an unusually high bill before it arrives so the utility can explain the cause and offer help early. The system has to run as a scheduled batch job, inside these limits: Prediction at least 10 days before bill issue, Reason code with every flag and Outreach is an offer of help never a penalty.

**Why it is hard.** The obvious approach is any bill rise, and it fails because seasonal rises are expected. The second trap is in "Cause": the real signal is weather, tariff, estimate or fault, while teams usually reach for a score only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way arrears after high bills measures it.

**What success looks like.** Offline: Calibration of bill shock probability, Reason code accuracy and Lead time before billing. Online: Bill complaints, Arrears after high bills and Contact centre calls. The launch is judged on "Bill complaints" while "Arrears after high bills" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which customers are heading for an unusually high bill before it arrives so the utility can explain the cause and offer help early.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Prediction at least 10 days before bill issue
- Reason code with every flag
- Outreach is an offer of help never a penalty
- Aggregated consumption features only
- 5M accounts

## The approach in one paragraph

Start with a rule flagging bills more than 50% above the last bill, because customer teams use similar rules. Then earn the move to a calibrated model on weather-adjusted consumption changes with a reason code and a proactive message workflow reviewed by customer operations, and only if it beats the baseline on Calibration of bill shock probability and Reason code accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Consumption against the same month last year | Change in usage for the same period. Core signal. Guard against: weather adjusted. |
| Add Tariff or price change | A change in unit price or plan. Explains a rise. Guard against: from billing. |
| Add Estimated read flag | Share of readings that are estimated. Catch-up risk. Guard against: from the meter system. |
| Run it as one pipeline | Consumption and billing extraction (MDM and CIS), Weather adjustment (degree day model), Bill shock model (gradient boosting), Reason code (rules), Outreach list (CRM), Customer message (templated channel) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle estimated reads | Estimated flags and an early notice. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Account number: an identifier.
- Postcode text alone: weak link.

**How the approach is proven**

Prove it offline on Calibration of bill shock probability, Reason code accuracy and Lead time before billing using time-ordered splits, then online on "Bill complaints" with "Arrears after high bills" as the guardrail. Watch for: Flagging seasonal rises, Penalising flagged customers and Scores with no reason.

## Baseline and production design

- **Baseline (build this first):** A rule flagging bills more than 50% above the last bill, because customer teams use similar rules.
- **Production design:** A calibrated model on weather-adjusted consumption changes with a reason code and a proactive message workflow reviewed by customer operations.

## Why AI, and why this kind

**Why AI.** Predict which customers are heading for an unusually high bill before it arrives so the utility can explain the cause and offer help early. The evidence that separates good from bad outcomes (Consumption against the same month last year, Tariff or price change, Estimated read flag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any bill rise" are what teams reach for first, and they fail because seasonal rises are expected. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated model on weather-adjusted consumption changes with a reason code and a proactive message workflow reviewed by customer operations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Consumption against the same month last year, Tariff or price change, Estimated read flag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rule flagging bills more than 50% above the last bill, because customer teams use similar rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated model on weather-adjusted consumption changes with a reason code and a proactive message workflow reviewed by customer operations | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bill complaints) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Flagging seasonal rises.
- Evaluation trap: Penalising flagged customers.
- Estimated reads: a catch-up read arrives late.
- Meter fault: readings are wrong.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
