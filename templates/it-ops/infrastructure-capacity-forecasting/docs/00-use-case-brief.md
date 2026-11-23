# Infrastructure Capacity Forecasting: use-case brief

> Generated from the blueprint `it-ops/infrastructure-capacity-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Infrastructure Capacity Forecasting · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast compute, storage and network demand by service with uncertainty ranges so capacity is ordered or reserved before headroom runs out. The system has to run as a scheduled batch job, inside these limits: Forecast horizon of 12 months, Ranges at the 50th and 95th percentiles and Headroom policy owned by service owners.

**Why it is hard.** The obvious approach is average usage, and it fails because peaks cause outages. The second trap is in "Drivers": the real signal is business events and growth plans, while teams usually reach for history only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way idle capacity cost measures it.

**What success looks like.** Offline: Error by service tier, Calibration of ranges and Peak capture rate. Online: Capacity shortfalls, Idle capacity cost and Emergency purchases. The launch is judged on "Capacity shortfalls" while "Idle capacity cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast compute, storage and network demand by service with uncertainty ranges so capacity is ordered or reserved before headroom runs out.

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

- Forecast horizon of 12 months
- Ranges at the 50th and 95th percentiles
- Headroom policy owned by service owners
- Weekly refresh for 20K resources

## The approach in one paragraph

Start with linear extrapolation of last year usage with a fixed buffer, because it is the usual method. Then earn the move to a hierarchical forecast by service with business drivers and launch events that produces ranges, headroom risk and recommended order dates, and only if it beats the baseline on Error by service tier and Calibration of ranges after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Utilisation history | CPU, memory, storage and network use. Core. Guard against: from monitoring. |
| Add Growth drivers | Users and transactions. Core. Guard against: from business data. |
| Add Planned launches and migrations | Events that change demand. Shock. Guard against: from planning. |
| Run it as one pipeline | Utilisation history (monitoring), Driver data (planning), Hierarchical forecast (time-series model), Scenario adjustment (planner), Headroom risk (analytics) and Order recommendation (planning tool), with Accuracy review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new product | Analogue services and wide ranges. |

**Deliberately not doing**

- Host name: an identifier.
- Vendor name: irrelevant.
- Team name: weak link.

**How the approach is proven**

Prove it offline on Error by service tier, Calibration of ranges and Peak capture rate using time-ordered splits, then online on "Capacity shortfalls" with "Idle capacity cost" as the guardrail. Watch for: Averages as the target, Point forecasts and Ignoring launches.

## Baseline and production design

- **Baseline (build this first):** Linear extrapolation of last year usage with a fixed buffer, because it is the usual method.
- **Production design:** A hierarchical forecast by service with business drivers and launch events that produces ranges, headroom risk and recommended order dates.

## Why AI, and why this kind

**Why AI.** Forecast compute, storage and network demand by service with uncertainty ranges so capacity is ordered or reserved before headroom runs out. The evidence that separates good from bad outcomes (Utilisation history, Growth drivers, Planned launches and migrations) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average usage" are what teams reach for first, and they fail because peaks cause outages. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A hierarchical forecast by service with business drivers and launch events that produces ranges, headroom risk and recommended order dates.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Utilisation history, Growth drivers, Planned launches and migrations and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Linear extrapolation of last year usage with a fixed buffer, because it is the usual method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical forecast by service with business drivers and launch events that produces ranges, headroom risk and recommended order dates | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Capacity shortfalls) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Averages as the target.
- Evaluation trap: Point forecasts.
- New product: no history exists.
- Migration to cloud: demand moves between platforms.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
