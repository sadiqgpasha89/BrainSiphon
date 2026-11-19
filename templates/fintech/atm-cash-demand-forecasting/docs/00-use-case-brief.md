# ATM Cash Demand Forecasting & Replenishment: use-case brief

> Generated from the blueprint `fintech/atm-cash-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ATM Cash Demand Forecasting & Replenishment · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast per-ATM cash demand to cut cash-out incidents while reducing idle cash and cash-in-transit visits. The system has to run as a scheduled batch job, inside these limits: Replenishment cost per visit, Cash-out SLA and 100k ATMs daily.

**Why it is hard.** The obvious approach is symmetric MSE, and it fails because running out costs far more than holding extra cash. The second trap is in "Censoring": the real signal is estimate true demand when ATM was empty, while teams usually reach for using dispensed cash as demand.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way idle cash balance measures it.

**What success looks like.** Offline: Pinball loss at 90th percentile and Cash-out probability calibration. Online: Cash-out incidents and Idle cash balance. The launch is judged on "Cash-out incidents" while "Idle cash balance" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast per-ATM cash demand to cut cash-out incidents while reducing idle cash and cash-in-transit visits.

**Training objective.** `\mathcal{L}=\sum_{t}\left[c_u(y_t-\hat y_t)^+ +c_o(\hat y_t-y_t)^+\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| c_u | Cost per unit of error: c_u when cash runs out (under-forecast) and c_o when excess cash sits idle (over-forecast). |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Replenishment cost per visit
- Cash-out SLA
- 100k ATMs daily
- Holiday and payday effects

## The approach in one paragraph

Start with seasonal naive by weekday and ATM. Then earn the move to global gradient-boosted quantile model with calendar covariates and de-censoring, feeding a vehicle-routing replenishment optimiser, and only if it beats the baseline on Pinball loss at 90th percentile and Cash-out probability calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Payday proximity | Days to local salary dates. Withdrawal surge. Guard against: region-specific calendars. |
| Add Location type | Branch, mall, transit, rural cluster. Demand profile. Guard against: cluster by behaviour not label. |
| Add Recent cash-out censoring flag | Hours out of cash in prior weeks. Demand correction. Guard against: use for de-censoring only. |
| Run it as one pipeline | ATM dispense logs (switch), De-censoring module (Tobit-style correction), Quantile forecaster (LightGBM), Cash-level optimiser (newsvendor rule), Route planner (VRP solver), Operations dispatch (CIT vendor) and Replenishment outcomes (cash-outs). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle local event (festival) drives demand | Event calendar features and manual override channel. |

**Deliberately not doing**

- ATM serial number: arbitrary.
- Weather daily noise: marginal after calendar.

**How the approach is proven**

Prove it offline on Pinball loss at 90th percentile and Cash-out probability calibration using time-ordered splits, then online on "Cash-out incidents" with "Idle cash balance" as the guardrail. Watch for: Treating censored days as true demand and Random CV over days.

## Baseline and production design

- **Baseline (build this first):** Seasonal naive by weekday and ATM.
- **Production design:** Global gradient-boosted quantile model with calendar covariates and de-censoring, feeding a vehicle-routing replenishment optimiser.

## Why AI, and why this kind

**Why AI.** Forecast per-ATM cash demand to cut cash-out incidents while reducing idle cash and cash-in-transit visits. The evidence that separates good from bad outcomes (Payday proximity, Location type, Recent cash-out censoring flag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "symmetric MSE" are what teams reach for first, and they fail because running out costs far more than holding extra cash. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Global gradient-boosted quantile model with calendar covariates and de-censoring, feeding a vehicle-routing replenishment optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Payday proximity, Location type, Recent cash-out censoring flag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Seasonal naive by weekday and ATM | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Global gradient-boosted quantile model with calendar covariates and de-censoring, feeding a vehicle-routing replenishment optimiser | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cash-out incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating censored days as true demand.
- Evaluation trap: Random CV over days.
- Local event (festival) drives demand: machines run out of cash during the event.
- ATM offline hours: demand data missing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
