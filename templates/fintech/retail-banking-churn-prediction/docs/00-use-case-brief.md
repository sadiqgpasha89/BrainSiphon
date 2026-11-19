# Retail Banking Churn Prediction: use-case brief

> Generated from the blueprint `fintech/retail-banking-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Retail Banking Churn Prediction · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify customers likely to leave within 90 days and trigger the right retention action at net-positive ROI. The system has to run as a scheduled batch job, inside these limits: Marketing consent, Offer budget and Weekly scoring.

**Why it is hard.** The obvious approach is targeting highest churn probability, and it fails because the likeliest churners often cannot be saved. The second trap is in "Definition": the real signal is churn as primary-account abandonment, not inactivity alone, while teams usually reach for account closure only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way save rate in treated vs control measures it.

**What success looks like.** Offline: Qini and uplift at top decile and AUC for churn. Online: Retained revenue net of offer cost and Save rate in treated vs control. The launch is judged on "Retained revenue net of offer cost" while "Save rate in treated vs control" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify customers likely to leave within 90 days and trigger the right retention action at net-positive ROI.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\quad\text{with uplift targeting: }\tau(x)=\mathbb{E}[Y(1)-Y(0)\mid x]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \tau | Uplift: the causal effect of the retention offer on whether the customer stays, for a customer with features x. |
| x | The customer's features. |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| Y | The outcome: Y(1) if the customer gets the offer and Y(0) if not. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |

**Hard constraints**

- Marketing consent
- Offer budget
- Weekly scoring
- Do not target customers likely to stay anyway

## The approach in one paragraph

Start with logistic regression on RFM features. Then earn the move to gBDT churn model plus a T-learner uplift model, with a budget-constrained treatment allocator, and only if it beats the baseline on Qini and uplift at top decile and AUC for churn after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Salary-credit shift | Share of incoming salary arriving to this account vs prior. Earliest abandonment cue. Guard against: detect before closure date. |
| Add Digital engagement decay | 4-week trend of logins and transactions. Disengagement. Guard against: exclude outage weeks. |
| Add Product depth | Number of active products and their stickiness. Retention driver. Guard against: count active, not opened. |
| Run it as one pipeline | Customer 360 (lakehouse), Feature builder (Spark), Churn and uplift models (GBDT), Treatment allocator (budget optimiser), Campaign orchestration (CRM), Relationship manager outreach (human follow-up) and Retention outcomes (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle product repricing event | Include price-change flags and cohort controls. |

**Deliberately not doing**

- Customer tenure alone: already captured by product depth.
- Branch assigned: stale, unrelated to digital behaviour.

**How the approach is proven**

Prove it offline on Qini and uplift at top decile and AUC for churn using time-ordered splits, then online on "Retained revenue net of offer cost" with "Save rate in treated vs control" as the guardrail. Watch for: Predicting churn and treating without holdout and Features computed after the churn event began.

## Baseline and production design

- **Baseline (build this first):** Logistic regression on RFM features.
- **Production design:** GBDT churn model plus a T-learner uplift model, with a budget-constrained treatment allocator.

## Why AI, and why this kind

**Why AI.** Identify customers likely to leave within 90 days and trigger the right retention action at net-positive ROI. The evidence that separates good from bad outcomes (Salary-credit shift, Digital engagement decay, Product depth) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "targeting highest churn probability" are what teams reach for first, and they fail because the likeliest churners often cannot be saved. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: GBDT churn model plus a T-learner uplift model, with a budget-constrained treatment allocator.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Salary-credit shift, Digital engagement decay, Product depth and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Logistic regression on RFM features | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GBDT churn model plus a T-learner uplift model, with a budget-constrained treatment allocator | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Retained revenue net of offer cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Predicting churn and treating without holdout.
- Evaluation trap: Features computed after the churn event began.
- Product repricing event: churn spike unrelated to behaviour.
- Treatment fatigue: repeated offers lose effect.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
