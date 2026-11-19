# Office Space Utilisation from Sensors: use-case brief

> Generated from the blueprint `real-estate/office-space-utilisation-from-sensors` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Office Space Utilisation from Sensors · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts. The system has to run as a scheduled batch job, inside these limits: No tracking of individuals at any step, Only aggregate counts are stored or shown and Reports remain valid with gaps in sensor data.

**Why it is hard.** The obvious approach is tracking named individuals by badge or device, and it fails because staff trust is easily lost, and individual tracking is a legal risk in many places. The second trap is in "Peak": the real signal is peak and typical use measured separately, while teams usually reach for the average occupancy over a week.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $5.3K a month. A mistake is expensive in the way cost saved measures it.

**What success looks like.** Offline: Count error and Peak error. Online: Space released and Cost saved. The launch is judged on "Space released" while "Cost saved" must not get worse.

## Objective, loss and constraints

**Business objective.** Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{MSE}(\hat{y}_t,y_t)+\lambda\,\mathrm{Huber}(\hat{o}-o)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{o} | The estimated peak occupancy of the space. |
| o | The observed peak occupancy from manual counts. |

**Hard constraints**

- No tracking of individuals at any step
- Only aggregate counts are stored or shown
- Reports remain valid with gaps in sensor data
- A weekly report goes to facilities and real-estate planners

## The approach in one paragraph

Start with annual manual headcount, because it is cheap. Then earn the move to occupancy estimation from sensor fusion with gap filling and a recommendation engine for layouts, and only if it beats the baseline on Count error and Peak error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Peak occupancy | 95th percentile of hourly counts per zone over four weeks. Peak demand drives the space needed. Guard against: sensor errors create spikes, so remove impossible values. |
| Add Booked vs used | Booked hours with no detected occupancy divided by booked hours. Measures wasted space. Guard against: booking data are often incomplete. |
| Add Dwell time | Median minutes people stay in a zone. Separates short drop-ins from real work. Guard against: sensors miss still people, so cross-check with a second source. |
| Run it as one pipeline | Sensors (IoT gateway), Cleaner (stream job), Occupancy estimator (model), Pattern miner (clustering), Recommender (rules) and Facilities dashboard (BI), with Archive off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor failure | Impute from nearby sensors and mark the interval as estimated. |

**Deliberately not doing**

- Sensor ID: A device label that carries no information on use.
- Floor colour: A physical attribute that does not affect occupancy.
- Badge number: A personal identifier that must not be used, for privacy.

**How the approach is proven**

Prove it offline on Count error and Peak error using time-ordered splits, then online on "Space released" with "Cost saved" as the guardrail. Watch for: A short pilot period misses seasonal peaks and holidays and Sensor bias, such as under-counting in doorways, makes the data look cleaner than the truth.

## Baseline and production design

- **Baseline (build this first):** Annual manual headcount, because it is cheap.
- **Production design:** Occupancy estimation from sensor fusion with gap filling and a recommendation engine for layouts.

## Why AI, and why this kind

**Why AI.** Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts. The evidence that separates good from bad outcomes (Peak occupancy, Booked vs used, Dwell time) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "tracking named individuals by badge or device" are what teams reach for first, and they fail because staff trust is easily lost, and individual tracking is a legal risk in many places. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Occupancy estimation from sensor fusion with gap filling and a recommendation engine for layouts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Peak occupancy, Booked vs used, Dwell time and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual manual headcount, because it is cheap | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Occupancy estimation from sensor fusion with gap filling and a recommendation engine for layouts | chosen | Meets the run-window envelope at $0.00062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Space released) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: A short pilot period misses seasonal peaks and holidays.
- Evaluation trap: Sensor bias, such as under-counting in doorways, makes the data look cleaner than the truth.
- Sensor failure: sensor failures create gaps in the occupancy counts.
- Hybrid days: patterns change when a hybrid policy changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
