# Day-Ahead Price Forecasting: use-case brief

> Generated from the blueprint `energy/day-ahead-price-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Day-Ahead Price Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast hourly day-ahead power prices with intervals from fuel prices, load and renewable forecasts so bids and hedges are planned with uncertainty. The system has to run as a scheduled batch job, inside these limits: Hourly forecast for the next day, Prediction intervals and spike probabilities and Forecast published before the bid deadline.

**Why it is hard.** The obvious approach is a single mean model, and it fails because spikes drive profit and risk. The second trap is in "Inputs": the real signal is forecast load, wind, solar and gas price, while teams usually reach for past prices only.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $2.5K a month. A mistake is expensive in the way hedging cost measures it.

**What success looks like.** Offline: Pinball loss, Spike recall at fixed precision and Interval coverage. Online: Bid value against the baseline, Hedging cost and Forecast error at peaks. The launch is judged on "Bid value against the baseline" while "Hedging cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast hourly day-ahead power prices with intervals from fuel prices, load and renewable forecasts so bids and hedges are planned with uncertainty.

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

- Hourly forecast for the next day
- Prediction intervals and spike probabilities
- Forecast published before the bid deadline
- Daily run for 30 zones

## The approach in one paragraph

Start with naive price from the same hour last week, because it is the standard benchmark. Then earn the move to a quantile gradient boosting or neural model on fundamentals with a spike probability head and scenario ensembles feeding the bid optimiser, and only if it beats the baseline on Pinball loss and Spike recall at fixed precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Residual load forecast | Demand minus wind and solar. Main driver. Guard against: from the forecasts. |
| Add Gas and carbon prices | Fuel and allowance prices. Marginal cost. Guard against: from market data. |
| Add Interconnector flows | Cross-border flow forecasts. Supply shifts. Guard against: from transmission operators. |
| Run it as one pipeline | Market and fundamentals ingestion (market data feeds), Feature build (lags and forecasts), Quantile forecast (model), Spike probability (classifier head), Scenario ensemble (simulation), Publish to bidding (trading system) and Accuracy tracking (daily). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle fuel price shock | Rapid refresh and regime flags. |

**Deliberately not doing**

- Trader name: irrelevant.
- Report channel: an artefact.
- Weather station name: an identifier.

**How the approach is proven**

Prove it offline on Pinball loss, Spike recall at fixed precision and Interval coverage using time-ordered splits, then online on "Bid value against the baseline" with "Hedging cost" as the guardrail. Watch for: Mean-only forecasts, Ignoring spikes and Using past prices alone.

## Baseline and production design

- **Baseline (build this first):** Naive price from the same hour last week, because it is the standard benchmark.
- **Production design:** A quantile gradient boosting or neural model on fundamentals with a spike probability head and scenario ensembles feeding the bid optimiser.

## Why AI, and why this kind

**Why AI.** Forecast hourly day-ahead power prices with intervals from fuel prices, load and renewable forecasts so bids and hedges are planned with uncertainty. The evidence that separates good from bad outcomes (Residual load forecast, Gas and carbon prices, Interconnector flows) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A single mean model" are what teams reach for first, and they fail because spikes drive profit and risk. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A quantile gradient boosting or neural model on fundamentals with a spike probability head and scenario ensembles feeding the bid optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Residual load forecast, Gas and carbon prices, Interconnector flows and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Naive price from the same hour last week, because it is the standard benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A quantile gradient boosting or neural model on fundamentals with a spike probability head and scenario ensembles feeding the bid optimiser | chosen | Meets the run-window envelope at $0.0012 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bid value against the baseline) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Mean-only forecasts.
- Evaluation trap: Ignoring spikes.
- Fuel price shock: the cost structure changes suddenly.
- Market rule change: the pricing rule is revised.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
