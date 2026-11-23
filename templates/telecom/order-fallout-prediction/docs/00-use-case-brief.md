# Order Fallout Prediction: use-case brief

> Generated from the blueprint `telecom/order-fallout-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Order Fallout Prediction · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which orders will fall out of automated processing and why, so they are fixed before the customer commitment date is missed. The system has to run as a scheduled batch job, inside these limits: Prediction at order entry and refreshed at each step, Top reasons shown to the fallout team and Precision above 50% on the top decile.

**Why it is hard.** The obvious approach is orders that were late for any reason, and it fails because late orders mix fallout and customer delay. The second trap is in "Timing": the real signal is features known at the time of scoring, while teams usually reach for final order attributes.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way manual touches per order measures it.

**What success looks like.** Offline: Precision and recall at fixed queue capacity, Cause class accuracy and Calibration by product. Online: Orders missing the commit date, Manual touches per order and Days to resolve fallout. The launch is judged on "Orders missing the commit date" while "Manual touches per order" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which orders will fall out of automated processing and why, so they are fixed before the customer commitment date is missed.

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

- Prediction at order entry and refreshed at each step
- Top reasons shown to the fallout team
- Precision above 50% on the top decile
- Scores for 2M open orders every hour

## The approach in one paragraph

Start with historical fallout rate by product and channel applied to new orders, because it is simple and shows the value of order-level features. Then earn the move to gradient boosting on order structure and step progress with cause-class outputs and calibrated probabilities, feeding a work queue ordered by the commit date and the expected effort, and only if it beats the baseline on Precision and recall at fixed queue capacity and Cause class accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Product and component complexity | Number of components and dependencies in the order. Complex orders fail more. Guard against: from the catalogue. |
| Add Address and service qualification quality | Match score of the address to inventory. Frequent cause. Guard against: needs the inventory match result. |
| Add Prior fallout rate of the order template | Fallout rate of this template over 90 days. Template risk. Guard against: exclude the order being scored. |
| Run it as one pipeline | Order event ingestion (streaming), Feature build (order and inventory joins), Fallout model (gradient boosting), Cause classifier (multi-class model), Fix tracking (case system) and Retrain (weekly), with Work queue ranking off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new product | Start from a type-level prior and widen thresholds. |

**Deliberately not doing**

- Order number: an identifier.
- Sales channel alone: weak link.
- Customer age: irrelevant.

**How the approach is proven**

Prove it offline on Precision and recall at fixed queue capacity, Cause class accuracy and Calibration by product using time-ordered splits, then online on "Orders missing the commit date" with "Manual touches per order" as the guardrail. Watch for: Using final order state as a feature, One label for all causes and Evaluating on random order splits.

## Baseline and production design

- **Baseline (build this first):** Historical fallout rate by product and channel applied to new orders, because it is simple and shows the value of order-level features.
- **Production design:** Gradient boosting on order structure and step progress with cause-class outputs and calibrated probabilities, feeding a work queue ordered by the commit date and the expected effort.

## Why AI, and why this kind

**Why AI.** Predict which orders will fall out of automated processing and why, so they are fixed before the customer commitment date is missed. The evidence that separates good from bad outcomes (Product and component complexity, Address and service qualification quality, Prior fallout rate of the order template) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "orders that were late for any reason" are what teams reach for first, and they fail because late orders mix fallout and customer delay. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on order structure and step progress with cause-class outputs and calibrated probabilities, feeding a work queue ordered by the commit date and the expected effort.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Product and component complexity, Address and service qualification quality, Prior fallout rate of the order template and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Historical fallout rate by product and channel applied to new orders, because it is simple and shows the value of order-level features | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on order structure and step progress with cause-class outputs and calibrated probabilities, feeding a work queue ordered by the commit date and the expected effort | chosen | Meets the run-window envelope at $0.183 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Orders missing the commit date) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using final order state as a feature.
- Evaluation trap: One label for all causes.
- New product: the new product has no history.
- Fix applied silently: the order recovers but the label is lost.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
