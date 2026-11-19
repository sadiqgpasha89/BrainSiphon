# Lease Renewal & Tenant Churn Prediction: use-case brief

> Generated from the blueprint `real-estate/lease-renewal-and-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lease Renewal & Tenant Churn Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table. The system has to run as a scheduled batch job, inside these limits: Renewal offers follow every local rent-control and notice rule, Offers are consistent and fair between comparable tenants and The decision is made 120 days before expiry to leave room to react.

**Why it is hard.** The obvious approach is the absolute rent amount, and it fails because tenants judge an offer against what else is available, not against their old rent. The second trap is in "Experience": the real signal is how the tenant was served, measured by repair times and complaints, while teams usually reach for the lease terms.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way net effective rent measures it.

**What success looks like.** Offline: PR-AUC and Calibration. Online: Renewal rate and Net effective rent. The launch is judged on "Renewal rate" while "Net effective rent" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table.

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

- Renewal offers follow every local rent-control and notice rule
- Offers are consistent and fair between comparable tenants
- The decision is made 120 days before expiry to leave room to react
- Each recommendation shows the factors behind it

## The approach in one paragraph

Start with historic renewal rate by building, because managers use it. Then earn the move to gradient boosting with price-gap and service features, plus an offer optimiser trading rent against churn, and only if it beats the baseline on PR-AUC and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Renewal rent gap | Proposed renewal rent minus the market rent for a similar unit. A tenant paying above market is likely to move. Guard against: market rent estimates are noisy, so use a range. |
| Add Maintenance resolution time | Median days to close a request in the last 12 months. A slow service experience drives churn. Guard against: logging gaps understate delays, so use ticket close dates. |
| Add Tenure | Months in the unit, bucketed into cohorts. Longer tenants are more likely to stay. Guard against: strongly tied to age and life stage, so check for unfairness. |
| Run it as one pipeline | Lease and service data (property system), Market rent feed (rent model), Renewal model (boosting), Offer optimiser (solver), Manager console (app), Offer log (CRM) and Outcome feed (warehouse). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rent control | Apply the cap as a hard constraint in the offer optimiser. |

**Deliberately not doing**

- Unit floor: A weak and unstable relation to renewal once price and service are known.
- Name: Irrelevant and a route to bias.
- Lease signing weekday: Reflects the manager's schedule and says nothing about intent.

**How the approach is proven**

Prove it offline on PR-AUC and Calibration using time-ordered splits, then online on "Renewal rate" with "Net effective rent" as the guardrail. Watch for: Past offers were not random, so renewals reflect the offer chosen and not the tenant and Seasonality in leases confuses year-to-year comparison.

## Baseline and production design

- **Baseline (build this first):** Historic renewal rate by building, because managers use it.
- **Production design:** Gradient boosting with price-gap and service features, plus an offer optimiser trading rent against churn.

## Why AI, and why this kind

**Why AI.** Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table. The evidence that separates good from bad outcomes (Renewal rent gap, Maintenance resolution time, Tenure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the absolute rent amount" are what teams reach for first, and they fail because tenants judge an offer against what else is available, not against their old rent. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting with price-gap and service features, plus an offer optimiser trading rent against churn.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Renewal rent gap, Maintenance resolution time, Tenure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Historic renewal rate by building, because managers use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting with price-gap and service features, plus an offer optimiser trading rent against churn | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Renewal rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Past offers were not random, so renewals reflect the offer chosen and not the tenant.
- Evaluation trap: Seasonality in leases confuses year-to-year comparison.
- Rent control: rent-control rules cap the increase and the offer would exceed the legal limit.
- Building works: building works disrupt tenants and raise churn for a period.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
