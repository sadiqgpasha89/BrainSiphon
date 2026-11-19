# House Price Index & Market Trend Forecasting: use-case brief

> Generated from the blueprint `real-estate/price-index-and-market-trend-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** House Price Index & Market Trend Forecasting · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters. The system has to run as a scheduled batch job, inside these limits: Published on a fixed monthly date with the revision policy stated up front, Every figure shown with a prediction interval, never a bare number and Methodology reproducible from the same inputs by an outside analyst.

**Why it is hard.** The obvious approach is the median sale price of the month, and it fails because the mix of homes that sell changes, so a median can fall in a month when every home's price rose. The second trap is in "Lag": the real signal is sales dates and recording dates modelled separately, with later revisions published, while teams usually reach for listing asking prices alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way forecast hit rate measures it.

**What success looks like.** Offline: Forecast error by horizon and Index revision size. Online: Users of the index and Forecast hit rate. The launch is judged on "Users of the index" while "Forecast hit rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{MSE}(\hat{y}_t,y_t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.9} | The model's predicted value at the chosen quantile. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Published on a fixed monthly date with the revision policy stated up front
- Every figure shown with a prediction interval, never a bare number
- Methodology reproducible from the same inputs by an outside analyst
- Thin markets pooled or flagged rather than published with false precision

## The approach in one paragraph

Start with median sale price by area with a naive trend, because press releases use it. Then earn the move to a repeat-sales and hedonic index with a forecast model on rates, supply and search, with intervals and revision control, and only if it beats the baseline on Forecast error by horizon and Index revision size after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Repeat-sales pairs | Log price change between two sales of the same property divided by the years between them. Holds the home constant, so the change is the market and not the mix. Guard against: few pairs exist in thin markets, so pool by region and report the count. |
| Add Mortgage rate | Average new-loan rate lagged by one to three months. Affordability moves demand with a lag. Guard against: use the rate known at the forecast date, not the revised one. |
| Add Active listings | Change in unsold inventory over the last quarter, scaled by monthly sales. Supply relative to demand moves prices. Guard against: definitions of active differ by portal, so standardise before comparing. |
| Run it as one pipeline | Sales records (land registry feeds), Index builder (repeat-sales regression), Leading indicators (market data), Forecast model (boosting plus VAR), Interval engine (quantile) and Publication (API and BI), with Archive off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle revisions | Track revisions and publish with a revision note. |

**Deliberately not doing**

- Social posts: Sentiment volumes swing with news cycles and carry little information about transaction prices.
- Single-sale outliers: One unusual sale such as a family transfer or a distressed deal should not move an area index.
- Agent commentary: Opinion that is not measured and cannot be reproduced.

**How the approach is proven**

Prove it offline on Forecast error by horizon and Index revision size using time-ordered splits, then online on "Users of the index" with "Forecast hit rate" as the guardrail. Watch for: A back-test run only through a rising market flatters any model that predicts continued growth and Look-ahead on revised data, since sales recorded later change earlier index values.

## Baseline and production design

- **Baseline (build this first):** Median sale price by area with a naive trend, because press releases use it.
- **Production design:** A repeat-sales and hedonic index with a forecast model on rates, supply and search, with intervals and revision control.

## Why AI, and why this kind

**Why AI.** Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters. The evidence that separates good from bad outcomes (Repeat-sales pairs, Mortgage rate, Active listings) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the median sale price of the month" are what teams reach for first, and they fail because the mix of homes that sell changes, so a median can fall in a month when every home's price rose. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A repeat-sales and hedonic index with a forecast model on rates, supply and search, with intervals and revision control.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Repeat-sales pairs, Mortgage rate, Active listings and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Median sale price by area with a naive trend, because press releases use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A repeat-sales and hedonic index with a forecast model on rates, supply and search, with intervals and revision control | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Users of the index) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: A back-test run only through a rising market flatters any model that predicts continued growth.
- Evaluation trap: Look-ahead on revised data, since sales recorded later change earlier index values.
- Revisions: late sales change earlier index values.
- Thin markets: a market with few sales gives a volatile index.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
