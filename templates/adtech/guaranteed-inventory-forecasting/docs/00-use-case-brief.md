# Guaranteed Inventory & Delivery Forecasting: use-case brief

> Generated from the blueprint `adtech/guaranteed-inventory-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Guaranteed Inventory & Delivery Forecasting · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast available impressions by audience and placement to sell guaranteed deals without under- or over-delivery. The system has to run as a scheduled batch job, inside these limits: Overbooking penalties, Audience overlap and Seasonality.

**Why it is hard.** The obvious approach is sum of segment forecasts, and it fails because segments overlap and sums overstate supply. The second trap is in "Risk": the real signal is conservative quantiles for sellable inventory, while teams usually reach for mean forecast.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way sell-through rate measures it.

**What success looks like.** Offline: Quantile loss at 20th percentile and Delivery success rate in backtest. Online: Under-delivery rate and Sell-through rate. The launch is judged on "Under-delivery rate" while "Sell-through rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast available impressions by audience and placement to sell guaranteed deals without under- or over-delivery.

**Training objective.** `\mathcal{L}=\sum_t\rho_{0.2}(y_t-\hat y_t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_{0.2} | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Overbooking penalties
- Audience overlap
- Seasonality
- Contract flight dates

## The approach in one paragraph

Start with same-period-last-year with growth factor. Then earn the move to hierarchical probabilistic forecasts with overlap modelling and a sellable-inventory calculator at the 20th percentile, and only if it beats the baseline on Quantile loss at 20th percentile and Delivery success rate in backtest after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Historical impressions by placement | Daily counts. Baseline. Guard against: cleaning. |
| Add Event calendar | Sports and holidays. Spikes. Guard against: known. |
| Add Booked inventory so far | Existing commitments. Net availability. Guard against: real-time. |
| Run it as one pipeline | Impression logs (lake), Hierarchical forecaster (GBDT quantile), Overlap estimator (audience model), Availability calculator (booking system) and Sales UI (avails), with Trafficker review and Delivery reports off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle publisher traffic change after redesign | Change-point detection and publisher alerts. |

**Deliberately not doing**

- Advertiser name: none.
- Creative size: none.

**How the approach is proven**

Prove it offline on Quantile loss at 20th percentile and Delivery success rate in backtest using time-ordered splits, then online on "Under-delivery rate" with "Sell-through rate" as the guardrail. Watch for: Ignoring overlap between audiences and Backtesting without bookings.

## Baseline and production design

- **Baseline (build this first):** Same-period-last-year with growth factor.
- **Production design:** Hierarchical probabilistic forecasts with overlap modelling and a sellable-inventory calculator at the 20th percentile.

## Why AI, and why this kind

**Why AI.** Forecast available impressions by audience and placement to sell guaranteed deals without under- or over-delivery. The evidence that separates good from bad outcomes (Historical impressions by placement, Event calendar, Booked inventory so far) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "sum of segment forecasts" are what teams reach for first, and they fail because segments overlap and sums overstate supply. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Hierarchical probabilistic forecasts with overlap modelling and a sellable-inventory calculator at the 20th percentile.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Historical impressions by placement, Event calendar, Booked inventory so far and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same-period-last-year with growth factor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical probabilistic forecasts with overlap modelling and a sellable-inventory calculator at the 20th percentile | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Under-delivery rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ignoring overlap between audiences.
- Evaluation trap: Backtesting without bookings.
- Publisher traffic change after redesign: forecasts stale.
- Overbooked deals across sellers: make-goods needed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
