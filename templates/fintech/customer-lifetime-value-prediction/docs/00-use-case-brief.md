# Customer Lifetime Value Prediction: use-case brief

> Generated from the blueprint `fintech/customer-lifetime-value-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Lifetime Value Prediction · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict 12-month and 36-month customer value at acquisition and over time to steer marketing spend and servicing tiers. The system has to run as a scheduled batch job, inside these limits: Calibrated across cohorts, Refresh weekly and Used in bid decisions so must not leak cost data.

**Why it is hard.** The obvious approach is mSE on raw spend, and it fails because a few whales dominate MSE and the model ignores everyone else. The second trap is in "Horizon": the real signal is cohort-based validation with observed horizon, while teams usually reach for mixing censored and mature customers.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way value captured in top decile measures it.

**What success looks like.** Offline: Normalised Gini of value ranking and Cohort-level calibration error. Online: Marketing ROI by channel and Value captured in top decile. The launch is judged on "Marketing ROI by channel" while "Value captured in top decile" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict 12-month and 36-month customer value at acquisition and over time to steer marketing spend and servicing tiers.

**Training objective.** `\mathcal{L}=\sum_i\mathrm{ZILN}(y_i;\pi_i,\mu_i,\sigma_i)=-\sum_i\left[\mathbb{1}_{y_i=0}\log\pi_i+\mathbb{1}_{y_i>0}\left(\log(1-\pi_i)+\log\mathcal{LN}(y_i;\mu_i,\sigma_i)\right)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{ZILN} | Zero-inflated log-normal loss: models outcomes that are often exactly zero and otherwise positive with a long right tail, such as customer spend. |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \pi_i | The probability that the customer's value is exactly zero. |
| \mu_i | The mean of the logarithm of spend when it is positive. |
| \sigma_i | The standard deviation of the logarithm of spend when it is positive. |
| \mathbb{1}_{y_i=0} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \mathcal{LN} | The log-normal density: models how large the spend is when it is not zero. |

**Hard constraints**

- Calibrated across cohorts
- Refresh weekly
- Used in bid decisions so must not leak cost data
- Explainable to finance

## The approach in one paragraph

Start with bG/NBD plus Gamma-Gamma probabilistic model. Then earn the move to zILN gradient-boosted model with cohort-aware calibration, quantile outputs for planning and a monotone constraint on engagement, and only if it beats the baseline on Normalised Gini of value ranking and Cohort-level calibration error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Early-life activity | Transactions and balances in the first 30 days. Strongest predictor of value. Guard against: fixed observation window per customer. |
| Add Product mix at 30d | Products held and funding patterns. Depth predicts value. Guard against: count at fixed day not current. |
| Add Acquisition source quality | Historical LTV of customers from the same source. Targeting feedback. Guard against: use matured cohorts only. |
| Run it as one pipeline | Customer ledger (lakehouse), Early-life feature builder (Spark), LTV model (ZILN GBDT), Calibration layer (cohort isotonic), Marketing bid feed (CDP) and Realised value tracker (cohort monitor), with Finance review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle product launch changes value drivers | Segment-level monitor with fast retrain triggers. |

**Deliberately not doing**

- Raw lifetime-to-date spend: encodes age, not future value.
- Customer ID cohort order: arbitrary.

**How the approach is proven**

Prove it offline on Normalised Gini of value ranking and Cohort-level calibration error using time-ordered splits, then online on "Marketing ROI by channel" with "Value captured in top decile" as the guardrail. Watch for: Using full-history features for young customers and Evaluating without censoring-aware metrics.

## Baseline and production design

- **Baseline (build this first):** BG/NBD plus Gamma-Gamma probabilistic model.
- **Production design:** ZILN gradient-boosted model with cohort-aware calibration, quantile outputs for planning and a monotone constraint on engagement.

## Why AI, and why this kind

**Why AI.** Predict 12-month and 36-month customer value at acquisition and over time to steer marketing spend and servicing tiers. The evidence that separates good from bad outcomes (Early-life activity, Product mix at 30d, Acquisition source quality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "MSE on raw spend" are what teams reach for first, and they fail because A few whales dominate MSE and the model ignores everyone else. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: ZILN gradient-boosted model with cohort-aware calibration, quantile outputs for planning and a monotone constraint on engagement.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Early-life activity, Product mix at 30d, Acquisition source quality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: BG/NBD plus Gamma-Gamma probabilistic model | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| ZILN gradient-boosted model with cohort-aware calibration, quantile outputs for planning and a monotone constraint on engagement | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Marketing ROI by channel) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using full-history features for young customers.
- Evaluation trap: Evaluating without censoring-aware metrics.
- Product launch changes value drivers: model underestimates new product customers.
- Macro downturn: lTV overestimated across cohorts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
