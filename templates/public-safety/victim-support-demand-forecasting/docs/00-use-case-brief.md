# Victim Support Service Demand Forecasting: use-case brief

> Generated from the blueprint `public-safety/victim-support-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Victim Support Service Demand Forecasting · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast demand for helplines, advocates and shelters from aggregated counts so staffing and partnerships meet need. The system has to run as a scheduled batch job, inside these limits: Aggregated counts only, Weekly forecast for 26 weeks and No individual-level data.

**Why it is hard.** The obvious approach is case-level data, and it fails because case data endangers survivors. The second trap is in "Use": the real signal is staffing and funding, while teams usually reach for targeting people.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way unanswered contacts measures it.

**What success looks like.** Offline: Forecast error by service area, Interval coverage and Peak detection. Online: Wait times, Unanswered contacts and Staffing accuracy. The launch is judged on "Wait times" while "Unanswered contacts" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast demand for helplines, advocates and shelters from aggregated counts so staffing and partnerships meet need.

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

- Aggregated counts only
- Weekly forecast for 26 weeks
- No individual-level data
- Scenarios for events and policy changes
- 100 service areas

## The approach in one paragraph

Start with last year's counts by month scaled by a trend, because it is the usual approach. Then earn the move to a hierarchical forecaster on aggregated counts with scenario inputs and a staffing view, with suppression rules for small cells, and only if it beats the baseline on Forecast error by service area and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Past service contacts | Counts by service and week. Anchor. Guard against: aggregated. |
| Add Holidays and major events | Calendar. Demand shifts. Guard against: from calendars. |
| Add Policy and funding changes | Programme changes. Shifts. Guard against: from policy. |
| Run it as one pipeline | Aggregated counts (service providers), Small-cell suppression (privacy rules), Feature build (calendar and policy joins), Forecast model (gradient boosting), Scenario ranges (simulation), Planner view (BI tool) and Accuracy tracking (quarterly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle reporting change | Versioned definitions. |

**Deliberately not doing**

- Client name: personal data.
- Case number: an identifier.
- Counsellor name: irrelevant.

**How the approach is proven**

Prove it offline on Forecast error by service area, Interval coverage and Peak detection using time-ordered splits, then online on "Wait times" with "Unanswered contacts" as the guardrail. Watch for: Case-level modelling, Using forecasts to target people and History-only forecasts.

## Baseline and production design

- **Baseline (build this first):** Last year's counts by month scaled by a trend, because it is the usual approach.
- **Production design:** A hierarchical forecaster on aggregated counts with scenario inputs and a staffing view, with suppression rules for small cells.

## Why AI, and why this kind

**Why AI.** Forecast demand for helplines, advocates and shelters from aggregated counts so staffing and partnerships meet need. The evidence that separates good from bad outcomes (Past service contacts, Holidays and major events, Policy and funding changes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "case-level data" are what teams reach for first, and they fail because case data endangers survivors. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A hierarchical forecaster on aggregated counts with scenario inputs and a staffing view, with suppression rules for small cells.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Past service contacts, Holidays and major events, Policy and funding changes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last year's counts by month scaled by a trend, because it is the usual approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical forecaster on aggregated counts with scenario inputs and a staffing view, with suppression rules for small cells | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Wait times) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Case-level modelling.
- Evaluation trap: Using forecasts to target people.
- Reporting change: providers change definitions.
- Awareness campaign: contacts jump after a campaign.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
