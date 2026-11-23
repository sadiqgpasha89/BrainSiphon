# Postpaid Churn Prediction: use-case brief

> Generated from the blueprint `telecom/postpaid-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Postpaid Churn Prediction · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which postpaid customers are likely to leave in the next 60 days and why, so retention offers go to those who can be saved at a sensible cost. The system has to run as a scheduled batch job, inside these limits: Offers capped by customer margin, Contact only within consent and Scores explained to retention agents.

**Why it is hard.** The obvious approach is any disconnect, and it fails because non-payment is not a retention problem. The second trap is in "Target": the real signal is customers whose decision can change with an offer, while teams usually reach for highest churn probability.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $2.0K a month. A mistake is expensive in the way offer cost per saved customer measures it.

**What success looks like.** Offline: Lift at the top decile, Calibration and Uplift AUUC. Online: Churn rate of targeted customers against control, Offer cost per saved customer and Customer satisfaction after offers. The launch is judged on "Churn rate of targeted customers against control" while "Offer cost per saved customer" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which postpaid customers are likely to leave in the next 60 days and why, so retention offers go to those who can be saved at a sensible cost.

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

- Offers capped by customer margin
- Contact only within consent
- Scores explained to retention agents
- Weekly scoring of 20M customers

## The approach in one paragraph

Start with logistic regression on tenure, contract end and recent complaints, because it is easy to explain and sets the benchmark. Then earn the move to gradient boosting for the churn risk plus an uplift model for who responds to offers, with explanations and an offer optimiser under margin caps, and only if it beats the baseline on Lift at the top decile and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Experience score trend | Trend in the customer's network experience score. Dissatisfaction signal. Guard against: join with the experience score. |
| Add Contract end proximity | Days to the end of the minimum term. Churn window. Guard against: from billing. |
| Add Care contact pattern | Repeat contacts and unresolved issues in 60 days. Frustration. Guard against: use coded reasons. |
| Run it as one pipeline | Customer feature build (lakehouse), Churn model (gradient boosting), Uplift model (causal model), Offer optimiser (constrained selection), Agent and campaign lists (CRM), Response tracking (analytics) and Retrain (monthly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle price rise month | Segment baseline adjustment and price-event features. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Number of lines alone: weak link.
- Handset colour: no link.

**How the approach is proven**

Prove it offline on Lift at the top decile, Calibration and Uplift AUUC using time-ordered splits, then online on "Churn rate of targeted customers against control" with "Offer cost per saved customer" as the guardrail. Watch for: Treating all leaves as churn, Targeting by risk alone and Measuring without a control group.

## Baseline and production design

- **Baseline (build this first):** Logistic regression on tenure, contract end and recent complaints, because it is easy to explain and sets the benchmark.
- **Production design:** Gradient boosting for the churn risk plus an uplift model for who responds to offers, with explanations and an offer optimiser under margin caps.

## Why AI, and why this kind

**Why AI.** Predict which postpaid customers are likely to leave in the next 60 days and why, so retention offers go to those who can be saved at a sensible cost. The evidence that separates good from bad outcomes (Experience score trend, Contract end proximity, Care contact pattern) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any disconnect" are what teams reach for first, and they fail because non-payment is not a retention problem. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting for the churn risk plus an uplift model for who responds to offers, with explanations and an offer optimiser under margin caps.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Experience score trend, Contract end proximity, Care contact pattern and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Logistic regression on tenure, contract end and recent complaints, because it is easy to explain and sets the benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting for the churn risk plus an uplift model for who responds to offers, with explanations and an offer optimiser under margin caps | chosen | Meets the run-window envelope at $0.022 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Churn rate of targeted customers against control) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating all leaves as churn.
- Evaluation trap: Targeting by risk alone.
- Price rise month: churn spikes for all.
- Competitor launch: churn patterns shift after the launch.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
