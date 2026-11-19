# Cash-Flow Forecasting for Small Businesses: use-case brief

> Generated from the blueprint `fintech/cash-flow-forecasting-smb` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cash-Flow Forecasting for Small Businesses · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast 13-week cash positions per SMB account to power overdraft alerts, lending offers and working-capital advice. The system has to run as a scheduled batch job, inside these limits: 5M businesses forecast nightly, Prediction intervals required and Invoice-level explainability.

**Why it is hard.** The obvious approach is one global ARIMA per account, and it fails because aggregate series hide predictable obligations. The second trap is in "Uncertainty": the real signal is quantile forecasts with coverage checks, while teams usually reach for point forecasts.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way offer take-up of working-capital products measures it.

**What success looks like.** Offline: Weighted quantile loss and Interval coverage at 80%. Online: Avoided overdraft incidents and Offer take-up of working-capital products. The launch is judged on "Avoided overdraft incidents" while "Offer take-up of working-capital products" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast 13-week cash positions per SMB account to power overdraft alerts, lending offers and working-capital advice.

**Training objective.** `\mathcal{L}=\sum_{t}\sum_{q\in\{.1,.5,.9\}}\rho_q\!\left(y_t-\hat y_t^{(q)}\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t^{(q)} | The model's prediction of y. (one value per time step or token t and quantile level q) |

**Hard constraints**

- 5M businesses forecast nightly
- Prediction intervals required
- Invoice-level explainability
- Cold-start for 6-week-old accounts

## The approach in one paragraph

Start with seasonal naive plus recurring-payment calendar. Then earn the move to global temporal fusion transformer with static sector embeddings and detected-recurrence covariates, conformal calibration on top, and only if it beats the baseline on Weighted quantile loss and Interval coverage at 80% after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Recurring payment schedule | Detected periodic outflows with amount and day pattern. Predictable skeleton of cash flow. Guard against: detect only on data before forecast origin. |
| Add Receivable ageing | Open invoices by days outstanding and payer behaviour. Timing of inflows. Guard against: use invoice status as-of origin. |
| Add Seasonality index by sector | Normalised monthly pattern for the business sector. Cold-start prior. Guard against: fit on rolling windows to avoid regime leakage. |
| Run it as one pipeline | Transaction ingestion (bank feeds), Recurrence detector (Spark job), Feature builder (point-in-time store), Quantile forecaster (TFT on GPU), Conformal calibrator (coverage tuning), Alert publisher (idempotent tables) and Customer actions (outcome tracking). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle large one-off tax payment | Calendar of statutory dates as known-future covariates. |

**Deliberately not doing**

- Business name: no information on cash flow.
- Account holder age: weak and unstable.

**How the approach is proven**

Prove it offline on Weighted quantile loss and Interval coverage at 80% using time-ordered splits, then online on "Avoided overdraft incidents" with "Offer take-up of working-capital products" as the guardrail. Watch for: Random cross-validation across time and Forecast origin features include the forecast period.

## Baseline and production design

- **Baseline (build this first):** Seasonal naive plus recurring-payment calendar.
- **Production design:** Global temporal fusion transformer with static sector embeddings and detected-recurrence covariates, conformal calibration on top.

## Why AI, and why this kind

**Why AI.** Forecast 13-week cash positions per SMB account to power overdraft alerts, lending offers and working-capital advice. The evidence that separates good from bad outcomes (Recurring payment schedule, Receivable ageing, Seasonality index by sector) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one global ARIMA per account" are what teams reach for first, and they fail because aggregate series hide predictable obligations. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Global temporal fusion transformer with static sector embeddings and detected-recurrence covariates, conformal calibration on top.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Recurring payment schedule, Receivable ageing, Seasonality index by sector and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Seasonal naive plus recurring-payment calendar | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Global temporal fusion transformer with static sector embeddings and detected-recurrence covariates, conformal calibration on top | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Avoided overdraft incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Random cross-validation across time.
- Evaluation trap: Forecast origin features include the forecast period.
- Large one-off tax payment: forecast breaks.
- New account with 6 weeks of data: volatile forecast.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
