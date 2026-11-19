# Indoor Air Quality & Comfort Anomaly Detection: use-case brief

> Generated from the blueprint `real-estate/indoor-air-quality-and-comfort-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Indoor Air Quality & Comfort Anomaly Detection · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues. The system has to run interactively, within a few seconds, inside these limits: Alerts are tuned to occupancy and room use so normal meetings do not alarm, Sensor health is tracked and faulty devices are excluded and No personal data collected and counts only.

**Why it is hard.** The obvious approach is fixed thresholds for every room, and it fails because a full meeting room raises CO2 for an hour and is normal, but a fixed threshold alarms on it. The second trap is in "Sensor": the real signal is sensor faults separated from real events, while teams usually reach for every anomaly treated as an environmental event.

**Scale and stakes.** At 10 million users this is about 864.0M model-touching events a day, 10.0K requests per second on average and 60.0K at peak, at an estimated $24.7K a month. A mistake is expensive in the way alerts acted on measures it.

**What success looks like.** Offline: Event recall and False alarms. Online: Complaints and Alerts acted on. The launch is judged on "Complaints" while "Alerts acted on" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{MSE}(\hat{x}_t,x_t)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{x}_t | The reconstruction of the input x produced by the decoder. (one value per time step or token t) |
| x_t | The input features describing one example (what the model sees). (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- Alerts are tuned to occupancy and room use so normal meetings do not alarm
- Sensor health is tracked and faulty devices are excluded
- No personal data collected and counts only
- Alert limits follow recognised indoor air quality standards

## The approach in one paragraph

Start with fixed limit alarms, because standards define them. Then earn the move to occupancy-conditioned anomaly detection with sensor health checks and a work-order link, and only if it beats the baseline on Event recall and False alarms after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around CO2 vs occupancy | Residual between measured CO2 and the CO2 expected for the current occupancy. Isolates ventilation faults from normal use. Guard against: occupancy counts are noisy, so smooth them. |
| Add Humidity drift | Slope of relative humidity over 7 days with a seasonal baseline. A rising trend signals mould risk. Guard against: seasonal effects are strong, so compare with the same season. |
| Add Particulate spike | PM2.5 rise above the rolling baseline, compared with outdoor PM2.5. Detects indoor sources and filter failure. Guard against: outdoor pollution enters, so compare with outside. |
| Run it as one pipeline | Sensors (IoT), Cleaner (stream), Baseline model (time-series), Anomaly scorer (model), Sensor health (rules), Work order (CMMS) and Dashboard (BI). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor drift | Calibrate sensors on a schedule and flag drifting devices. |

**Deliberately not doing**

- Room name: A label that carries no information on air quality.
- Sensor ID: A device label that does not describe conditions.
- Floor: Floor number has weak relation once the ventilation system is known.

**How the approach is proven**

Prove it offline on Event recall and False alarms using time-ordered splits, then online on "Complaints" with "Alerts acted on" as the guardrail. Watch for: Few labelled events, so recall is poorly estimated and Clean data from the first months of a deployment hides later drift and faults.

## Baseline and production design

- **Baseline (build this first):** Fixed limit alarms, because standards define them.
- **Production design:** Occupancy-conditioned anomaly detection with sensor health checks and a work-order link.

## Why AI, and why this kind

**Why AI.** Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues. The evidence that separates good from bad outcomes (CO2 vs occupancy, Humidity drift, Particulate spike) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed thresholds for every room" are what teams reach for first, and they fail because A full meeting room raises CO2 for an hour and is normal, but a fixed threshold alarms on it. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Occupancy-conditioned anomaly detection with sensor health checks and a work-order link.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among CO2 vs occupancy, Humidity drift, Particulate spike and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed limit alarms, because standards define them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Occupancy-conditioned anomaly detection with sensor health checks and a work-order link | chosen | Meets the 2500 ms envelope at $0.00095 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Complaints) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Few labelled events, so recall is poorly estimated.
- Evaluation trap: Clean data from the first months of a deployment hides later drift and faults.
- Sensor drift: sensor drift makes readings wrong over time.
- Events: a crowd in a room raises CO2 for a short time.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
