# Cold-Chain Excursion Prediction: use-case brief

> Generated from the blueprint `supply-chain/cold-chain-temperature-excursion-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cold-Chain Excursion Prediction · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict temperature excursions in reefer trailers and pharma shipments minutes ahead so interventions save the load. The system has to run in under 100 milliseconds, inside these limits: GDP / HACCP compliance, Intervention lead time of 15-60 minutes and Sensor drift.

**Why it is hard.** The obvious approach is pure sequence model, and it fails because physics-informed features generalise across trailers. The second trap is in "Action": the real signal is alert with a recommended action and time-to-breach, while teams usually reach for raw temperature chart.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 20.0K at peak, at an estimated $9.3K a month. A mistake is expensive in the way alerts acted upon measures it.

**What success looks like.** Offline: Lead time at fixed precision and Time-to-breach error. Online: Product loss from excursions and Alerts acted upon. The launch is judged on "Product loss from excursions" while "Alerts acted upon" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict temperature excursions in reefer trailers and pharma shipments minutes ahead so interventions save the load.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y_{t+h},p_t)+\lambda\,\mathrm{Huber}(T_{t+h},\hat T_{t+h})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_{t+h} | The label: 1 if the temperature goes out of range at t+h. |
| p_t | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| T_{t+h} | The temperature at time t+h: the hat is the model's predicted temperature. |
| \hat{T}_{t+h} | The model's predicted time. (one value per time step or token t and forecast step h) |

**Hard constraints**

- GDP / HACCP compliance
- Intervention lead time of 15-60 minutes
- Sensor drift
- Audit trail

## The approach in one paragraph

Start with threshold alarms at limit temperatures. Then earn the move to gray-box thermal model combined with a sequence network predicting time-to-breach, with calibrated alerts to driver and control tower, and only if it beats the baseline on Lead time at fixed precision and Time-to-breach error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Door-open events | Duration and count. Heat ingress. Guard against: sensor. |
| Add Ambient vs setpoint delta | Outside temp minus setpoint. Load on cooling. Guard against: weather. |
| Add Cooling unit duty cycle | Compressor on-time fraction. Capacity. Guard against: unit telemetry. |
| Run it as one pipeline | Telemetry stream (IoT), Thermal feature builder (stream), Time-to-breach model (gray-box plus GRU), Alert policy (calibrated thresholds), Driver and control tower (human), Corrective action log (audit) and Outcome labels (quality records). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor drift | Redundant sensors and drift detection. |

**Deliberately not doing**

- Trailer ID: none.
- Route colour: none.

**How the approach is proven**

Prove it offline on Lead time at fixed precision and Time-to-breach error using time-ordered splits, then online on "Product loss from excursions" with "Alerts acted upon" as the guardrail. Watch for: Excursion labels incomplete and Evaluating on loaded routes only.

## Baseline and production design

- **Baseline (build this first):** Threshold alarms at limit temperatures.
- **Production design:** Gray-box thermal model combined with a sequence network predicting time-to-breach, with calibrated alerts to driver and control tower.

## Why AI, and why this kind

**Why AI.** Predict temperature excursions in reefer trailers and pharma shipments minutes ahead so interventions save the load. The evidence that separates good from bad outcomes (Door-open events, Ambient vs setpoint delta, Cooling unit duty cycle) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pure sequence model" are what teams reach for first, and they fail because physics-informed features generalise across trailers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Gray-box thermal model combined with a sequence network predicting time-to-breach, with calibrated alerts to driver and control tower.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Door-open events, Ambient vs setpoint delta, Cooling unit duty cycle and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Threshold alarms at limit temperatures | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gray-box thermal model combined with a sequence network predicting time-to-breach, with calibrated alerts to driver and control tower | chosen | Meets the 80 ms envelope at $0.0011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Product loss from excursions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Excursion labels incomplete.
- Evaluation trap: Evaluating on loaded routes only.
- Sensor drift: false alarms or misses.
- Door left open during loading: rapid excursion.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
