# Retail Energy Churn Prediction: use-case brief

> Generated from the blueprint `energy/retail-energy-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Retail Energy Churn Prediction · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which retail energy customers are likely to switch supplier in the coming months so the retention team can offer a fair, relevant plan. The system has to run as a scheduled batch job, inside these limits: Churn probability for the next 90 days, Calibrated scores for offer budgets and Offers only to customers who have not been disadvantaged.

**Why it is hard.** The obvious approach is calls to cancel, and it fails because many callers stay. The second trap is in "Fairness": the real signal is equal access to the best plans, while teams usually reach for better prices only for those about to leave.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way offer cost per saved customer measures it.

**What success looks like.** Offline: Calibration, Uplift of retention offers and Lift at the campaign size. Online: Retention rate, Offer cost per saved customer and Complaints about offers. The launch is judged on "Retention rate" while "Offer cost per saved customer" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which retail energy customers are likely to switch supplier in the coming months so the retention team can offer a fair, relevant plan.

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

- Churn probability for the next 90 days
- Calibrated scores for offer budgets
- Offers only to customers who have not been disadvantaged
- No sensitive or vulnerability data as features
- 4M accounts

## The approach in one paragraph

Start with contact customers whose fixed term ends in the next 60 days, because it is the standard retention rule. Then earn the move to a calibrated churn model with price-gap and event features, an offer policy limited by fairness rules and uplift testing to confirm that offers change behaviour, and only if it beats the baseline on Calibration and Uplift of retention offers after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Price gap to the best market offer | Difference between current and best available price. Switch motive. Guard against: from market data. |
| Add Contract end date | Days until the fixed term ends. Timing. Guard against: from contracts. |
| Add Contact and complaint history | Recent complaints and contacts. Dissatisfaction. Guard against: from CRM. |
| Run it as one pipeline | Customer and market data (CRM and price feeds), Feature build (time-aware joins), Churn model (gradient boosting), Offer policy (rules), Uplift testing (randomised holdouts), Campaign execution (marketing system) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle market price drop | Price-gap features and campaign capacity limits. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Marketing channel alone: weak link.
- Postcode text: an identifier.

**How the approach is proven**

Prove it offline on Calibration, Uplift of retention offers and Lift at the campaign size using time-ordered splits, then online on "Retention rate" with "Offer cost per saved customer" as the guardrail. Watch for: Targeting loyal customers with worse prices, Leakage from post-switch data and Scores without uplift tests.

## Baseline and production design

- **Baseline (build this first):** Contact customers whose fixed term ends in the next 60 days, because it is the standard retention rule.
- **Production design:** A calibrated churn model with price-gap and event features, an offer policy limited by fairness rules and uplift testing to confirm that offers change behaviour.

## Why AI, and why this kind

**Why AI.** Predict which retail energy customers are likely to switch supplier in the coming months so the retention team can offer a fair, relevant plan. The evidence that separates good from bad outcomes (Price gap to the best market offer, Contract end date, Contact and complaint history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "calls to cancel" are what teams reach for first, and they fail because many callers stay. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated churn model with price-gap and event features, an offer policy limited by fairness rules and uplift testing to confirm that offers change behaviour.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Price gap to the best market offer, Contract end date, Contact and complaint history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Contact customers whose fixed term ends in the next 60 days, because it is the standard retention rule | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated churn model with price-gap and event features, an offer policy limited by fairness rules and uplift testing to confirm that offers change behaviour | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Retention rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Targeting loyal customers with worse prices.
- Evaluation trap: Leakage from post-switch data.
- Market price drop: many customers become at risk at once.
- Regulatory rule: an offer is not allowed for some groups.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
