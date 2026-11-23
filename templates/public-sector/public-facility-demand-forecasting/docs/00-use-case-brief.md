# Public Facility Demand Forecasting: use-case brief

> Generated from the blueprint `public-sector/public-facility-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Facility Demand Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast use of libraries, pools and community centres by site and hour so opening hours, staffing and programmes match demand. The system has to run as a scheduled batch job, inside these limits: Aggregated visit counts only, Equity targets for access and Weather and event inputs.

**Why it is hard.** The obvious approach is individual visitor tracking, and it fails because not needed for planning. The second trap is in "Goal": the real signal is access and use balanced with cost, while teams usually reach for maximum use only.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $3.5K a month. A mistake is expensive in the way access in high-need areas measures it.

**What success looks like.** Offline: Visit count error by site, Peak error and Equity target attainment. Online: Use per opening hour, Access in high-need areas and Staff overtime. The launch is judged on "Use per opening hour" while "Access in high-need areas" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast use of libraries, pools and community centres by site and hour so opening hours, staffing and programmes match demand.

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

- Aggregated visit counts only
- Equity targets for access
- Weather and event inputs
- Monthly plans for 400 sites

## The approach in one paragraph

Start with last year's hours by site with seasonal adjustments, because it is the common practice. Then earn the move to a site-level forecaster with weather and programme covariates, equity targets and an hours and staffing proposal for managers, and only if it beats the baseline on Visit count error by site and Peak error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Past visits by hour and day | Counts by site. Anchor. Guard against: from counters. |
| Add Weather and holidays | Weather and calendar. Demand shifts. Guard against: from calendars. |
| Add Programme schedule | Classes and events. Demand. Guard against: from bookings. |
| Run it as one pipeline | Counter and booking data (facility systems), Aggregation (batch), Forecast model (gradient boosting), Equity target check (rules), Hours and staffing proposal (planning tool), Manager approval (review) and Accuracy tracking (quarterly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle counter fault | Data quality checks. |

**Deliberately not doing**

- Visitor name: personal data.
- Staff name: irrelevant.
- Site code: an identifier.

**How the approach is proven**

Prove it offline on Visit count error by site, Peak error and Equity target attainment using time-ordered splits, then online on "Use per opening hour" with "Access in high-need areas" as the guardrail. Watch for: Maximising use only, Individual tracking and Dashboards with no schedule changes.

## Baseline and production design

- **Baseline (build this first):** Last year's hours by site with seasonal adjustments, because it is the common practice.
- **Production design:** A site-level forecaster with weather and programme covariates, equity targets and an hours and staffing proposal for managers.

## Why AI, and why this kind

**Why AI.** Forecast use of libraries, pools and community centres by site and hour so opening hours, staffing and programmes match demand. The evidence that separates good from bad outcomes (Past visits by hour and day, Weather and holidays, Programme schedule) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individual visitor tracking" are what teams reach for first, and they fail because not needed for planning. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A site-level forecaster with weather and programme covariates, equity targets and an hours and staffing proposal for managers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Past visits by hour and day, Weather and holidays, Programme schedule and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last year's hours by site with seasonal adjustments, because it is the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A site-level forecaster with weather and programme covariates, equity targets and an hours and staffing proposal for managers | chosen | Meets the run-window envelope at $0.0016 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Use per opening hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Maximising use only.
- Evaluation trap: Individual tracking.
- Counter fault: counts are wrong.
- New programme: the effect is unknown.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
