# Settlement Fail Prediction: use-case brief

> Generated from the blueprint `bfsi/settlement-fail-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Settlement Fail Prediction · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which trades will fail to settle on the intended date so operations can chase the counterparty, borrow securities or fund early. The system has to run as a scheduled batch job, inside these limits: Predictions delivered by 04:00 for the settlement day, Explanation per flagged trade and Operations capacity of 500 chases a day.

**Why it is hard.** The obvious approach is features including the actual instruction status after the fact, and it fails because post-event status leaks the label. The second trap is in "Capacity": the real signal is ranking by expected loss within the chase capacity, while teams usually reach for classification accuracy.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way penalty cost measures it.

**What success looks like.** Offline: PR-AUC at the chase capacity and Calibration by market. Online: Fails avoided per day and Penalty cost. The launch is judged on "Fails avoided per day" while "Penalty cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which trades will fail to settle on the intended date so operations can chase the counterparty, borrow securities or fund early.

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

- Predictions delivered by 04:00 for the settlement day
- Explanation per flagged trade
- Operations capacity of 500 chases a day
- No customer data outside the bank

## The approach in one paragraph

Start with a rule list by counterparty fail history and unmatched status, because operations already use it. Then earn the move to gradient boosting trained on matured settlement outcomes with calibrated probabilities, ranked by expected penalty and shown with top reasons, and only if it beats the baseline on PR-AUC at the chase capacity and Calibration by market after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Counterparty fail rate 30d | Fails divided by trades in 30 days by counterparty and market. Strong repeat pattern. Guard against: window must end the previous day. |
| Add Instrument liquidity | Average daily volume and borrow availability. Illiquid securities fail more. Guard against: borrow data comes from lenders. |
| Add Matching status | Whether both sides' instructions have matched. Unmatched trades fail. Guard against: status snapshots must be as at 04:00. |
| Run it as one pipeline | Trade and instruction feed (post-trade platform), Feature builder (Spark), Fail model (gradient boosting), Penalty estimator (rules), Outcome capture (settlement confirmations) and Model monitor (dashboard), with Chase queue off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle market holiday | Use a calendar service per market and compute every window against the real settlement date. |

**Deliberately not doing**

- Trader name: arbitrary.
- Trade comment text: free text, inconsistent.
- Booking system id: arbitrary.

**How the approach is proven**

Prove it offline on PR-AUC at the chase capacity and Calibration by market using time-ordered splits, then online on "Fails avoided per day" with "Penalty cost" as the guardrail. Watch for: Using post-cut-off status and Operations intervention changes outcomes, labels mixed.

## Baseline and production design

- **Baseline (build this first):** A rule list by counterparty fail history and unmatched status, because operations already use it.
- **Production design:** Gradient boosting trained on matured settlement outcomes with calibrated probabilities, ranked by expected penalty and shown with top reasons.

## Why AI, and why this kind

**Why AI.** Predict which trades will fail to settle on the intended date so operations can chase the counterparty, borrow securities or fund early. The evidence that separates good from bad outcomes (Counterparty fail rate 30d, Instrument liquidity, Matching status) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "features including the actual instruction status after the fact" are what teams reach for first, and they fail because post-event status leaks the label. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting trained on matured settlement outcomes with calibrated probabilities, ranked by expected penalty and shown with top reasons.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Counterparty fail rate 30d, Instrument liquidity, Matching status and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rule list by counterparty fail history and unmatched status, because operations already use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting trained on matured settlement outcomes with calibrated probabilities, ranked by expected penalty and shown with top reasons | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fails avoided per day) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using post-cut-off status.
- Evaluation trap: Operations intervention changes outcomes, labels mixed.
- Market holiday: a market holiday shifts the settlement day and the features are computed for the wrong date.
- Corporate action: trade affected by an event.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
