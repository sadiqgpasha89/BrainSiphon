# Customer Repurchase & Churn Prediction: use-case brief

> Generated from the blueprint `retail/customer-churn-and-repurchase-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Repurchase & Churn Prediction · **Domain:** retail · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict who will order again in the next 30/60/90 days to time retention actions and acquisition value estimates. The system has to run as a scheduled batch job, inside these limits: Non-contractual setting, Purchase cycles differ by category and Weekly scoring.

**Why it is hard.** The obvious approach is fixed 90-day inactivity, and it fails because replenishment cycles vary from days to years. The second trap is in "Targeting": the real signal is uplift on retention actions, while teams usually reach for churn probability.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way repeat purchase rate measures it.

**What success looks like.** Offline: Time-dependent AUC and Calibration by cohort. Online: Retained customers per marketing dollar and Repeat purchase rate. The launch is judged on "Retained customers per marketing dollar" while "Repeat purchase rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict who will order again in the next 30/60/90 days to time retention actions and acquisition value estimates.

**Training objective.** `\mathcal{L}=-\sum_i\left[\delta_i\log h(t_i)-H(t_i)\right]\quad\text{(discrete-time survival)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \delta_i | Event indicator: 1 if customer i churned, 0 if still active at the end of observation. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| h | The hazard: the chance of churning at time t given still active. |
| t_i | The time customer i churned or was last observed. |
| H | The cumulative hazard: the accumulated churn risk up to time t_i. |

**Hard constraints**

- Non-contractual setting
- Purchase cycles differ by category
- Weekly scoring
- Consent

## The approach in one paragraph

Start with bG/NBD probabilistic repurchase model. Then earn the move to discrete-time survival GBDT with category-cycle features and an uplift layer for action selection, and only if it beats the baseline on Time-dependent AUC and Calibration by cohort after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Recency over expected interval | Days since last order divided by personal median interval. Lapse measure. Guard against: median from prior orders. |
| Add Category mix breadth | Number of categories purchased. Engagement depth. Guard against: cumulative to date. |
| Add Return and complaint ratio | Returns plus complaints over orders. Dissatisfaction. Guard against: use settled events. |
| Run it as one pipeline | Order history (lakehouse), Interval features (Spark), Survival model (GBDT hazard), Uplift selector (T-learner), CRM dispatch (campaign tool), Holdout analysis (experiment) and Outcome labels (repeat orders). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle seasonal buyers (gifting) | Seasonality-aware expected interval. |

**Deliberately not doing**

- Customer ID cohort: arbitrary.
- Marketing consent flag: channel artefact.

**How the approach is proven**

Prove it offline on Time-dependent AUC and Calibration by cohort using time-ordered splits, then online on "Retained customers per marketing dollar" with "Repeat purchase rate" as the guardrail. Watch for: Random split mixing customer periods and Using future orders to define the active window.

## Baseline and production design

- **Baseline (build this first):** BG/NBD probabilistic repurchase model.
- **Production design:** Discrete-time survival GBDT with category-cycle features and an uplift layer for action selection.

## Why AI, and why this kind

**Why AI.** Predict who will order again in the next 30/60/90 days to time retention actions and acquisition value estimates. The evidence that separates good from bad outcomes (Recency over expected interval, Category mix breadth, Return and complaint ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed 90-day inactivity" are what teams reach for first, and they fail because replenishment cycles vary from days to years. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Discrete-time survival GBDT with category-cycle features and an uplift layer for action selection.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Recency over expected interval, Category mix breadth, Return and complaint ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: BG/NBD probabilistic repurchase model | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Discrete-time survival GBDT with category-cycle features and an uplift layer for action selection | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Retained customers per marketing dollar) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Random split mixing customer periods.
- Evaluation trap: Using future orders to define the active window.
- Seasonal buyers (gifting): wrongly labelled churned.
- Consent withdrawal: features and targeting must stop.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
