# Parking Occupancy Prediction: use-case brief

> Generated from the blueprint `public-sector/parking-occupancy-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Parking Occupancy Prediction · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict parking occupancy by street and lot for the next hours so drivers get guidance and pricing and enforcement follow demand. The system has to run as a scheduled batch job, inside these limits: Forecast to 3 hours at 15-minute resolution, Aggregated occupancy only and No tracking of plates.

**Why it is hard.** The obvious approach is plate-level histories, and it fails because plate data is personal. The second trap is in "Use": the real signal is guidance and dynamic pricing within policy, while teams usually reach for automatic fines.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $9.0K a month. A mistake is expensive in the way occupancy near target measures it.

**What success looks like.** Offline: Occupancy error by zone, Peak error and Guidance accuracy. Online: Cruising time, Occupancy near target and Complaints about availability. The launch is judged on "Cruising time" while "Occupancy near target" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict parking occupancy by street and lot for the next hours so drivers get guidance and pricing and enforcement follow demand.

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

- Forecast to 3 hours at 15-minute resolution
- Aggregated occupancy only
- No tracking of plates
- Enforcement guidance is advice and not an automatic fine
- 100K spaces

## The approach in one paragraph

Start with same-hour-last-week occupancy by zone, because it is the simple benchmark. Then earn the move to a zone-level forecaster with event covariates, guidance messages to drivers and occupancy-based pricing recommendations for approval, and only if it beats the baseline on Occupancy error by zone and Peak error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Current occupancy | Occupancy now by zone. Anchor. Guard against: from sensors and payments. |
| Add Same time last week | Occupancy in prior weeks. Pattern. Guard against: aligned. |
| Add Events and weather | Event calendar and weather. Demand shifts. Guard against: from data. |
| Run it as one pipeline | Occupancy and payment data (sensors and meters), Aggregation (zones), Forecast model (gradient boosting), Guidance messages (apps and signs), Pricing recommendation (policy tool), Approval (parking authority) and Accuracy tracking (monthly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor outage | Payment-only estimates and flags. |

**Deliberately not doing**

- Plate number: personal data.
- Meter name: an identifier.
- Officer name: irrelevant.

**How the approach is proven**

Prove it offline on Occupancy error by zone, Peak error and Guidance accuracy using time-ordered splits, then online on "Cruising time" with "Occupancy near target" as the guardrail. Watch for: Plate-level tracking, Automatic fines from forecasts and Daily totals only.

## Baseline and production design

- **Baseline (build this first):** Same-hour-last-week occupancy by zone, because it is the simple benchmark.
- **Production design:** A zone-level forecaster with event covariates, guidance messages to drivers and occupancy-based pricing recommendations for approval.

## Why AI, and why this kind

**Why AI.** Predict parking occupancy by street and lot for the next hours so drivers get guidance and pricing and enforcement follow demand. The evidence that separates good from bad outcomes (Current occupancy, Same time last week, Events and weather) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "plate-level histories" are what teams reach for first, and they fail because plate data is personal. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A zone-level forecaster with event covariates, guidance messages to drivers and occupancy-based pricing recommendations for approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Current occupancy, Same time last week, Events and weather and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same-hour-last-week occupancy by zone, because it is the simple benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A zone-level forecaster with event covariates, guidance messages to drivers and occupancy-based pricing recommendations for approval | chosen | Meets the run-window envelope at $0.0010 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cruising time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Plate-level tracking.
- Evaluation trap: Automatic fines from forecasts.
- Sensor outage: a zone loses data.
- Special event: demand jumps for a few hours.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
