# Traffic Flow Forecasting: use-case brief

> Generated from the blueprint `public-sector/traffic-flow-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Traffic Flow Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast traffic flow and travel times on city roads for the next hours from detectors and aggregated probe data so operators and travellers plan around congestion. The system has to run as a scheduled batch job, inside these limits: 5-minute resolution up to 2 hours with hourly values up to 24 hours, Aggregated and anonymised data only and Intervals reported.

**Why it is hard.** The obvious approach is independent link forecasts, and it fails because congestion propagates along roads. The second trap is in "Privacy": the real signal is aggregated speeds and counts, while teams usually reach for individual vehicle traces.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $9.0K a month. A mistake is expensive in the way travel time reliability measures it.

**What success looks like.** Offline: Error by horizon, Coverage and Congestion onset detection. Online: Delay forecast accuracy, Travel time reliability and Operator response time. The launch is judged on "Delay forecast accuracy" while "Travel time reliability" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast traffic flow and travel times on city roads for the next hours from detectors and aggregated probe data so operators and travellers plan around congestion.

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

- 5-minute resolution up to 2 hours with hourly values up to 24 hours
- Aggregated and anonymised data only
- Intervals reported
- Updates every 5 minutes
- 20K road links

## The approach in one paragraph

Start with historical average speed by link and time, because it is the common baseline. Then earn the move to a spatio-temporal graph model with event and weather covariates, interval outputs and an operator dashboard that suggests control measures, and only if it beats the baseline on Error by horizon and Coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Upstream flow and speed | Conditions on neighbouring links. Propagation. Guard against: from the graph. |
| Add Event and incident flags | Known events and incidents. Shocks. Guard against: from operations. |
| Add Weather | Rain, snow and visibility. Capacity effect. Guard against: from weather data. |
| Run it as one pipeline | Detector and probe aggregation (traffic data platform), Cleaning and gap fill (batch), Graph feature build (road network), Forecast model (graph neural network), Interval estimate (quantile heads), Operator dashboard (traffic centre) and Accuracy tracking (weekly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle detector outage | Imputation limits and a flag. |

**Deliberately not doing**

- Detector name: an identifier.
- Operator name: irrelevant.
- Log format: an artefact.

**How the approach is proven**

Prove it offline on Error by horizon, Coverage and Congestion onset detection using time-ordered splits, then online on "Delay forecast accuracy" with "Travel time reliability" as the guardrail. Watch for: Independent link models, Individual traces and Averages as the forecast.

## Baseline and production design

- **Baseline (build this first):** Historical average speed by link and time, because it is the common baseline.
- **Production design:** A spatio-temporal graph model with event and weather covariates, interval outputs and an operator dashboard that suggests control measures.

## Why AI, and why this kind

**Why AI.** Forecast traffic flow and travel times on city roads for the next hours from detectors and aggregated probe data so operators and travellers plan around congestion. The evidence that separates good from bad outcomes (Upstream flow and speed, Event and incident flags, Weather) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "independent link forecasts" are what teams reach for first, and they fail because congestion propagates along roads. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A spatio-temporal graph model with event and weather covariates, interval outputs and an operator dashboard that suggests control measures.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Upstream flow and speed, Event and incident flags, Weather and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Historical average speed by link and time, because it is the common baseline | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A spatio-temporal graph model with event and weather covariates, interval outputs and an operator dashboard that suggests control measures | chosen | Meets the run-window envelope at $0.0010 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Delay forecast accuracy) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Independent link models.
- Evaluation trap: Individual traces.
- Detector outage: data for a corridor is missing.
- Major incident: flow changes suddenly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
