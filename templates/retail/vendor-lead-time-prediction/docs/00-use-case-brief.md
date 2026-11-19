# Vendor Lead-Time Prediction: use-case brief

> Generated from the blueprint `retail/vendor-lead-time-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Lead-Time Prediction · **Domain:** retail · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict real delivery lead times per vendor, lane and item to set accurate safety stock and avoid stock-outs. The system has to run as a scheduled batch job, inside these limits: Sparse history for new vendors, Disruption events and Weekly refresh.

**Why it is hard.** The obvious approach is vendor-quoted lead time, and it fails because quoted times are systematically optimistic. The second trap is in "Tail": the real signal is upper quantiles for risk, while teams usually reach for mean lead time.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way safety stock reduction measures it.

**What success looks like.** Offline: Quantile loss at 90th percentile and Coverage of intervals. Online: Stock-out events and Safety stock reduction. The launch is judged on "Stock-out events" while "Safety stock reduction" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict real delivery lead times per vendor, lane and item to set accurate safety stock and avoid stock-outs.

**Training objective.** `\mathcal{L}=\sum_i\rho_{0.9}(y_i-\hat q_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_{0.9} | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \hat{q}_i | The model's predicted value at the chosen quantile. (one value per example i) |

**Hard constraints**

- Sparse history for new vendors
- Disruption events
- Weekly refresh
- Buyer-facing explanation

## The approach in one paragraph

Start with vendor-quoted lead time plus a fixed buffer. Then earn the move to quantile gradient boosting with vendor hierarchical priors and disruption features, producing lead-time distributions for the replenishment engine, and only if it beats the baseline on Quantile loss at 90th percentile and Coverage of intervals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Vendor on-time history | Rolling on-time rate and variance. Reliability. Guard against: window before PO date. |
| Add Lane congestion indicator | Port or lane delay index. External delay. Guard against: as-of index. |
| Add Order size vs vendor capacity | PO quantity over vendor usual. Capacity strain. Guard against: normalise by vendor. |
| Run it as one pipeline | PO and receipt data (ERP), Feature builder (Spark), Quantile lead-time model (LightGBM), Distribution publisher (planning service), Buyer dashboard (explanation) and Disruption monitor (news and port feeds), with Receipt feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle port strike | Disruption feeds and manual override. |

**Deliberately not doing**

- PO number: arbitrary.
- Buyer name: personal habits.

**How the approach is proven**

Prove it offline on Quantile loss at 90th percentile and Coverage of intervals using time-ordered splits, then online on "Stock-out events" with "Safety stock reduction" as the guardrail. Watch for: Using received dates for undelivered open orders and Ignoring partial shipments.

## Baseline and production design

- **Baseline (build this first):** Vendor-quoted lead time plus a fixed buffer.
- **Production design:** Quantile gradient boosting with vendor hierarchical priors and disruption features, producing lead-time distributions for the replenishment engine.

## Why AI, and why this kind

**Why AI.** Predict real delivery lead times per vendor, lane and item to set accurate safety stock and avoid stock-outs. The evidence that separates good from bad outcomes (Vendor on-time history, Lane congestion indicator, Order size vs vendor capacity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "vendor-quoted lead time" are what teams reach for first, and they fail because quoted times are systematically optimistic. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Quantile gradient boosting with vendor hierarchical priors and disruption features, producing lead-time distributions for the replenishment engine.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Vendor on-time history, Lane congestion indicator, Order size vs vendor capacity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Vendor-quoted lead time plus a fixed buffer | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile gradient boosting with vendor hierarchical priors and disruption features, producing lead-time distributions for the replenishment engine | chosen | Meets the run-window envelope at $0.090 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Stock-out events) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using received dates for undelivered open orders.
- Evaluation trap: Ignoring partial shipments.
- Port strike: lead times jump suddenly.
- New vendor: no delivery history exists so the model gives overconfident lead-time estimates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
