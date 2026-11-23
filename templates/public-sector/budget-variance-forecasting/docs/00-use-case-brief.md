# Public Budget Variance Forecasting: use-case brief

> Generated from the blueprint `public-sector/budget-variance-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Budget Variance Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast year-end spending and revenue by department from monthly actuals so finance teams act early on overspends and shortfalls. The system has to run as a scheduled batch job, inside these limits: Monthly forecast to year end with ranges, Drivers explained by line item and Finance staff review.

**Why it is hard.** The obvious approach is one growth rate, and it fails because lines behave differently. The second trap is in "Use": the real signal is early warnings and mitigation, while teams usually reach for a report.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way forecast accuracy measures it.

**What success looks like.** Offline: Forecast error by line, Interval coverage and Early warning lead time. Online: Overspend at year end, Forecast accuracy and Time to mitigation. The launch is judged on "Overspend at year end" while "Forecast accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast year-end spending and revenue by department from monthly actuals so finance teams act early on overspends and shortfalls.

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

- Monthly forecast to year end with ranges
- Drivers explained by line item
- Finance staff review
- Policy and one-off items flagged
- 300 budget lines

## The approach in one paragraph

Start with straight-line projection of spend to date, because it is the standard monthly check. Then earn the move to a line-item model with seasonal profiles and committed spend, intervals and driver explanations, reviewed in monthly finance meetings, and only if it beats the baseline on Forecast error by line and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Spend to date against profile | Year-to-date spend against seasonal profile. Core signal. Guard against: from finance. |
| Add Committed spend | Open orders and contracts. Near-term. Guard against: from procurement. |
| Add Revenue drivers | Tax receipts and fees. Revenue. Guard against: from revenue systems. |
| Run it as one pipeline | Actuals and commitments (finance system), Profile model (seasonal regression), Driver adjustments (rules), Forecast with ranges (quantile model) and Accuracy tracking (monthly), with Variance report and Finance review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle late invoices | Commitment-based adjustments. |

**Deliberately not doing**

- Budget holder name: irrelevant.
- Cost centre code: an identifier.
- Report format: an artefact.

**How the approach is proven**

Prove it offline on Forecast error by line, Interval coverage and Early warning lead time using time-ordered splits, then online on "Overspend at year end" with "Forecast accuracy" as the guardrail. Watch for: Straight-line projections, Point forecasts and Ignoring commitments.

## Baseline and production design

- **Baseline (build this first):** Straight-line projection of spend to date, because it is the standard monthly check.
- **Production design:** A line-item model with seasonal profiles and committed spend, intervals and driver explanations, reviewed in monthly finance meetings.

## Why AI, and why this kind

**Why AI.** Forecast year-end spending and revenue by department from monthly actuals so finance teams act early on overspends and shortfalls. The evidence that separates good from bad outcomes (Spend to date against profile, Committed spend, Revenue drivers) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one growth rate" are what teams reach for first, and they fail because lines behave differently. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A line-item model with seasonal profiles and committed spend, intervals and driver explanations, reviewed in monthly finance meetings.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Spend to date against profile, Committed spend, Revenue drivers and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Straight-line projection of spend to date, because it is the standard monthly check | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A line-item model with seasonal profiles and committed spend, intervals and driver explanations, reviewed in monthly finance meetings | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overspend at year end) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Straight-line projections.
- Evaluation trap: Point forecasts.
- Late invoices: spend is understated.
- Emergency spend: an event adds costs.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
