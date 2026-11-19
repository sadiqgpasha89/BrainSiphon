# Short-Term Rental Pricing & Occupancy Forecasting: use-case brief

> Generated from the blueprint `real-estate/short-term-rental-pricing-and-occupancy` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Short-Term Rental Pricing & Occupancy Forecasting · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend nightly prices and forecast occupancy for short-term rentals around events and seasons. The system has to run as a scheduled batch job, inside these limits: Local limits on rental nights are loaded and obeyed, Host-set minimum prices are never undercut and Prices refresh daily for the next 365 nights.

**Why it is hard.** The obvious approach is day of the week alone, and it fails because a single concert can double demand for one weekend, and a weekday model never sees it. The second trap is in "Booking window": the real signal is the days remaining before the stay and the pickup so far, while teams usually reach for a static price for the whole calendar.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way occupancy measures it.

**What success looks like.** Offline: Occupancy error and Revenue vs baseline. Online: RevPAR and Occupancy. The launch is judged on "RevPAR" while "Occupancy" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend nightly prices and forecast occupancy for short-term rentals around events and seasons.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.5},y_t)+\lambda\,\mathrm{Huber}(\hat{p}-p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.5} | The model's predicted value at the chosen quantile. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |

**Hard constraints**

- Local limits on rental nights are loaded and obeyed
- Host-set minimum prices are never undercut
- Prices refresh daily for the next 365 nights
- Each price change is explained to the host

## The approach in one paragraph

Start with fixed seasonal prices by month, because hosts do this. Then earn the move to quantile occupancy model with a price optimiser per night and host guardrails, and only if it beats the baseline on Occupancy error and Revenue vs baseline after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Event calendar | Number and size of events within 5 km in the stay window. Events are the biggest driver of short-term demand. Guard against: event data are patchy, so combine providers. |
| Add Booking pace | Bookings so far divided by the normal bookings for this lead time. Shows whether the stay date is filling faster than usual. Guard against: noisy for new listings, so use a prior. |
| Add Comparable prices | Median nightly price of comparable listings for the same date. Sets the competitive position. Guard against: selection bias, since only unsold nights show prices. |
| Run it as one pipeline | Calendar and bookings (channel manager), Event feed (data providers), Occupancy model (boosting), Price optimiser (solver), Host controls (app), Price push (channel API) and Outcome log (warehouse). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle local ban | Load regulation as configuration and cap nights in the occupancy forecast. |

**Deliberately not doing**

- Host name: No effect on demand.
- Photo count: Weakly related once quality is measured.
- Listing title: A style choice that does not change demand.

**How the approach is proven**

Prove it offline on Occupancy error and Revenue vs baseline using time-ordered splits, then online on "RevPAR" with "Occupancy" as the guardrail. Watch for: Past prices are partly caused by the hosts' own expectations, so demand and price are tangled and Event noise from one-off festivals produces peaks the model cannot repeat.

## Baseline and production design

- **Baseline (build this first):** Fixed seasonal prices by month, because hosts do this.
- **Production design:** Quantile occupancy model with a price optimiser per night and host guardrails.

## Why AI, and why this kind

**Why AI.** Recommend nightly prices and forecast occupancy for short-term rentals around events and seasons. The evidence that separates good from bad outcomes (Event calendar, Booking pace, Comparable prices) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "day of the week alone" are what teams reach for first, and they fail because A single concert can double demand for one weekend, and a weekday model never sees it. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Quantile occupancy model with a price optimiser per night and host guardrails.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Event calendar, Booking pace, Comparable prices and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed seasonal prices by month, because hosts do this | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile occupancy model with a price optimiser per night and host guardrails | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (RevPAR) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Past prices are partly caused by the hosts' own expectations, so demand and price are tangled.
- Evaluation trap: Event noise from one-off festivals produces peaks the model cannot repeat.
- Local ban: a local ban or cap on short-term nights removes available supply.
- Event cancelled: a major event is cancelled and the high prices no longer fit demand.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
