# Homelessness Service Demand Forecasting: use-case brief

> Generated from the blueprint `public-sector/homelessness-service-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Homelessness Service Demand Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast demand for shelter, outreach and prevention services from aggregated data so capacity and funding are planned ahead, without tracking individuals. The system has to run as a scheduled batch job, inside these limits: Aggregated counts by area and service, No individual risk scoring and Scenario ranges for winter and economic shocks.

**Why it is hard.** The obvious approach is ranking individuals for services, and it fails because individual scoring can deny help. The second trap is in "Data": the real signal is aggregated service counts, while teams usually reach for individual case histories.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way planning accuracy measures it.

**What success looks like.** Offline: Error by area, Interval coverage and Scenario usefulness in review. Online: Capacity shortfall nights, Planning accuracy and Prevention funding timing. The launch is judged on "Capacity shortfall nights" while "Planning accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast demand for shelter, outreach and prevention services from aggregated data so capacity and funding are planned ahead, without tracking individuals.

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

- Aggregated counts by area and service
- No individual risk scoring
- Scenario ranges for winter and economic shocks
- Monthly run
- 20 service areas

## The approach in one paragraph

Start with last year's demand by month scaled by the current trend, because it is the planning norm. Then earn the move to a hierarchical forecaster on aggregated data with economic and weather covariates, scenario ranges and a capacity planning view, and only if it beats the baseline on Error by area and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Past service use | Counts by service and month. Anchor. Guard against: from services. |
| Add Weather and season | Cold nights and winter. Seasonal driver. Guard against: from weather data. |
| Add Housing and economic indicators | Rents, evictions and unemployment. Driver. Guard against: from statistics. |
| Run it as one pipeline | Aggregated counts (service providers), Cleaning and harmonising (batch), Feature build (statistics joins), Forecast model (gradient boosting), Scenario ranges (simulation), Planner dashboard (BI tool) and Accuracy tracking (quarterly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle reporting gaps | Nowcasting and flags. |

**Deliberately not doing**

- Client name: personal data.
- Case id: an identifier.
- Provider name: irrelevant.

**How the approach is proven**

Prove it offline on Error by area, Interval coverage and Scenario usefulness in review using time-ordered splits, then online on "Capacity shortfall nights" with "Planning accuracy" as the guardrail. Watch for: Individual risk scoring, Point forecasts only and Case-level data in planning.

## Baseline and production design

- **Baseline (build this first):** Last year's demand by month scaled by the current trend, because it is the planning norm.
- **Production design:** A hierarchical forecaster on aggregated data with economic and weather covariates, scenario ranges and a capacity planning view.

## Why AI, and why this kind

**Why AI.** Forecast demand for shelter, outreach and prevention services from aggregated data so capacity and funding are planned ahead, without tracking individuals. The evidence that separates good from bad outcomes (Past service use, Weather and season, Housing and economic indicators) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "ranking individuals for services" are what teams reach for first, and they fail because individual scoring can deny help. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A hierarchical forecaster on aggregated data with economic and weather covariates, scenario ranges and a capacity planning view.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Past service use, Weather and season, Housing and economic indicators and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last year's demand by month scaled by the current trend, because it is the planning norm | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical forecaster on aggregated data with economic and weather covariates, scenario ranges and a capacity planning view | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Capacity shortfall nights) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual risk scoring.
- Evaluation trap: Point forecasts only.
- Reporting gaps: providers report late.
- Policy shock: an eviction rule changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
