# Commercial Occupancy & Rent-Roll Forecasting: use-case brief

> Generated from the blueprint `real-estate/commercial-occupancy-and-rent-roll-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Occupancy & Rent-Roll Forecasting · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand. The system has to run as a scheduled batch job, inside these limits: The forecast is built lease by lease and reconciles to the current rent roll, Updated every quarter with a record of changes and Downside, base and upside scenarios shown together.

**Why it is hard.** The obvious approach is a smooth occupancy trend, and it fails because occupancy moves in steps at expiries, and a trend line smooths over the cliff. The second trap is in "Renewal": the real signal is tenant-level renewal probability based on that tenant, while teams usually reach for a portfolio average renewal rate.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way leasing decisions measures it.

**What success looks like.** Offline: Occupancy error and Income error. Online: Forecast accuracy and Leasing decisions. The launch is judged on "Forecast accuracy" while "Leasing decisions" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.5},y_t)+\lambda\,\mathrm{Huber}(\hat{r}-r)`

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
| \hat{r} | The model's predicted value of the quantity r. |
| r | The actual rental income of the property in the period, with \hat{r} the forecast. |

**Hard constraints**

- The forecast is built lease by lease and reconciles to the current rent roll
- Updated every quarter with a record of changes
- Downside, base and upside scenarios shown together
- Every property forecast traces to its lease and tenant assumptions

## The approach in one paragraph

Start with assume a flat renewal rate and market rent growth, because it is simple. Then earn the move to lease-level simulation with tenant renewal models and market scenarios, aggregated to fan charts, and only if it beats the baseline on Occupancy error and Income error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Expiry profile | Share of income expiring within 12 months and within 36 months. The main driver of near-term income risk. Guard against: break options can move the real expiry earlier, so include them. |
| Add Renewal propensity | Predicted probability that the tenant renews, from tenant sector, size and history. Gives the expected income retained. Guard against: few renewal events per tenant, so pool by tenant type. |
| Add Submarket vacancy | Vacancy rate of comparable space within the submarket over the last 8 quarters. Shows the strength of demand for re-letting. Guard against: sources define vacancy differently, so use one source throughout. |
| Run it as one pipeline | Rent roll (property system), Lease terms (abstract database), Renewal model (boosting), Market model (time-series), Simulator (Monte Carlo) and Asset manager dashboard (BI), with Archive off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle anchor tenant leaves | Model anchor tenants individually and run explicit single-name scenarios. |

**Deliberately not doing**

- Property name: A label that carries no income information.
- Manager: The identity of the property manager does not change lease terms.
- Photo: Images of the building say nothing about lease expiries or tenants.

**How the approach is proven**

Prove it offline on Occupancy error and Income error using time-ordered splits, then online on "Forecast accuracy" with "Leasing decisions" as the guardrail. Watch for: A back-test through a strong market makes any renewal assumption look good and Errors in the lease data feed straight through to the forecast and are mistaken for model error.

## Baseline and production design

- **Baseline (build this first):** Assume a flat renewal rate and market rent growth, because it is simple.
- **Production design:** Lease-level simulation with tenant renewal models and market scenarios, aggregated to fan charts.

## Why AI, and why this kind

**Why AI.** Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand. The evidence that separates good from bad outcomes (Expiry profile, Renewal propensity, Submarket vacancy) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A smooth occupancy trend" are what teams reach for first, and they fail because occupancy moves in steps at expiries, and a trend line smooths over the cliff. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Lease-level simulation with tenant renewal models and market scenarios, aggregated to fan charts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Expiry profile, Renewal propensity, Submarket vacancy and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Assume a flat renewal rate and market rent growth, because it is simple | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Lease-level simulation with tenant renewal models and market scenarios, aggregated to fan charts | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Forecast accuracy) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: A back-test through a strong market makes any renewal assumption look good.
- Evaluation trap: Errors in the lease data feed straight through to the forecast and are mistaken for model error.
- Anchor tenant leaves: the anchor tenant leaves and occupancy drops far more than the model expects.
- Incentives: incentives such as free rent make the passing rent differ from the effective rent.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
