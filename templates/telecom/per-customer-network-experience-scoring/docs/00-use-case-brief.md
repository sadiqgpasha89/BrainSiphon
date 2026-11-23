# Per-Customer Network Experience Scoring: use-case brief

> Generated from the blueprint `telecom/per-customer-network-experience-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Per-Customer Network Experience Scoring · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compute a daily experience score per customer from the sessions they actually had, so operations and care see who is truly affected rather than which cells are busy. The system has to run as a scheduled batch job, inside these limits: Score based on aggregated session KPIs not content, Customers with too few sessions get no score not a guess and Score tracks survey satisfaction.

**Why it is hard.** The obvious approach is average cell KPIs, and it fails because cell averages hide the customers in the tail. The second trap is in "Weighting": the real signal is weights learned against satisfaction and churn, while teams usually reach for hand-set weights.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $2.4K a month. A mistake is expensive in the way churn among low-score customers measures it.

**What success looks like.** Offline: Correlation with survey satisfaction, Lift in predicting care contacts and Calibration of the bands. Online: Contacts per low-score customer, Churn among low-score customers and Reduction in unaddressed low scores. The launch is judged on "Contacts per low-score customer" while "Churn among low-score customers" must not get worse.

## Objective, loss and constraints

**Business objective.** Compute a daily experience score per customer from the sessions they actually had, so operations and care see who is truly affected rather than which cells are busy.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Score based on aggregated session KPIs not content
- Customers with too few sessions get no score not a guess
- Score tracks survey satisfaction
- 20M subscribers scored per day

## The approach in one paragraph

Start with the average KPI of the cells where the customer spent time, because it is easy and a baseline for the learned score. Then earn the move to a tabular model trained on survey scores and subsequent contacts, using per-customer session aggregates, with score bands and the top contributing issue for each customer, and only if it beats the baseline on Correlation with survey satisfaction and Lift in predicting care contacts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Session success rate | Share of sessions that completed. Basic quality. Guard against: define per service type. |
| Add Throughput versus plan | Achieved throughput relative to the plan and time. Visible speed gap. Guard against: device limits matter. |
| Add Latency and jitter for interactive apps | Median and p95 per app type. Video and gaming experience. Guard against: use app classes not contents. |
| Run it as one pipeline | Session KPI aggregation (batch), Customer feature build (lakehouse), Experience model (gradient boosting), Score banding and reason (rules), Publish to care and ops (data product) and Retrain (monthly), with Survey feedback join off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle heavy traveller | Aggregate by experience not by cell. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Data volume alone: usage not quality.
- Handset age: weak link.

**How the approach is proven**

Prove it offline on Correlation with survey satisfaction, Lift in predicting care contacts and Calibration of the bands using time-ordered splits, then online on "Contacts per low-score customer" with "Churn among low-score customers" as the guardrail. Watch for: Averaging KPIs by cell, Hand-set weights never revisited and Scoring customers with too few sessions.

## Baseline and production design

- **Baseline (build this first):** The average KPI of the cells where the customer spent time, because it is easy and a baseline for the learned score.
- **Production design:** A tabular model trained on survey scores and subsequent contacts, using per-customer session aggregates, with score bands and the top contributing issue for each customer.

## Why AI, and why this kind

**Why AI.** Compute a daily experience score per customer from the sessions they actually had, so operations and care see who is truly affected rather than which cells are busy. The evidence that separates good from bad outcomes (Session success rate, Throughput versus plan, Latency and jitter for interactive apps) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average cell KPIs" are what teams reach for first, and they fail because cell averages hide the customers in the tail. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A tabular model trained on survey scores and subsequent contacts, using per-customer session aggregates, with score bands and the top contributing issue for each customer.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Session success rate, Throughput versus plan, Latency and jitter for interactive apps and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The average KPI of the cells where the customer spent time, because it is easy and a baseline for the learned score | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A tabular model trained on survey scores and subsequent contacts, using per-customer session aggregates, with score bands and the top contributing issue for each customer | chosen | Meets the run-window envelope at $0.013 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Contacts per low-score customer) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Averaging KPIs by cell.
- Evaluation trap: Hand-set weights never revisited.
- Heavy traveller: sessions in many cells.
- Roaming visitor: only partial data exists for the visitor.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
