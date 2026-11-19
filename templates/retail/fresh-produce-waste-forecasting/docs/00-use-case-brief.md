# Fresh Produce Waste & Order Forecasting: use-case brief

> Generated from the blueprint `retail/fresh-produce-waste-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fresh Produce Waste & Order Forecasting · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast daily demand and shelf-life decay for perishables to cut waste while keeping availability above target. The system has to run as a scheduled batch job, inside these limits: Shelf-life windows, Supplier delivery cut-offs and Markdown rules.

**Why it is hard.** The obvious approach is symmetric loss, and it fails because waste cost and stock-out cost differ by item. The second trap is in "Age": the real signal is inventory ageing profile in the state, while teams usually reach for total stock.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way in-stock rate measures it.

**What success looks like.** Offline: Weighted pinball and expected waste and Availability at policy. Online: Waste percentage and In-stock rate. The launch is judged on "Waste percentage" while "In-stock rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast daily demand and shelf-life decay for perishables to cut waste while keeping availability above target.

**Training objective.** `\mathcal{L}=\sum_t\left[c_w(\hat q_t-y_t)^+ +c_s(y_t-\hat q_t)^+\right]+\lambda\,\mathrm{ShelfLifePenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| c_w | Cost per unit of waste (c_w) or shortage (c_s). |
| \hat{q}_t | The forecast quantity to order or stock. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ShelfLifePenalty} | Penalty for ordering more than can be sold before the produce spoils. |

**Hard constraints**

- Shelf-life windows
- Supplier delivery cut-offs
- Markdown rules
- Store-level orders daily

## The approach in one paragraph

Start with rolling average ordering with a safety factor. Then earn the move to quantile gradient boosting with age-aware state feeding a newsvendor policy and a markdown trigger for near-expiry stock, and only if it beats the baseline on Weighted pinball and expected waste and Availability at policy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Stock-by-age vector | Units by remaining shelf life. Waste risk. Guard against: snapshot at order time. |
| Add Weather-temperature forecast | Forecast temperature. Demand for seasonal fresh. Guard against: forecast not actual. |
| Add Promo and holiday calendar | Planned events. Demand spikes. Guard against: known at order time. |
| Run it as one pipeline | POS and stock feed (lakehouse), Age-profile builder (batch job), Demand quantile model (LightGBM), Order optimiser (newsvendor rule), Markdown trigger (expiry rules), Store ordering (ERP) and Waste tracking (KPI). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supplier delivers poorer shelf life | Receipt-quality capture and supplier scorecard. |

**Deliberately not doing**

- Supplier name: encoded by lead time.
- Day-of-month: spurious.

**How the approach is proven**

Prove it offline on Weighted pinball and expected waste and Availability at policy using time-ordered splits, then online on "Waste percentage" with "In-stock rate" as the guardrail. Watch for: Backtest ignores shelf-life state and Censored demand at stock-out.

## Baseline and production design

- **Baseline (build this first):** Rolling average ordering with a safety factor.
- **Production design:** Quantile gradient boosting with age-aware state feeding a newsvendor policy and a markdown trigger for near-expiry stock.

## Why AI, and why this kind

**Why AI.** Forecast daily demand and shelf-life decay for perishables to cut waste while keeping availability above target. The evidence that separates good from bad outcomes (Stock-by-age vector, Weather-temperature forecast, Promo and holiday calendar) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "symmetric loss" are what teams reach for first, and they fail because waste cost and stock-out cost differ by item. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Quantile gradient boosting with age-aware state feeding a newsvendor policy and a markdown trigger for near-expiry stock.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Stock-by-age vector, Weather-temperature forecast, Promo and holiday calendar and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rolling average ordering with a safety factor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile gradient boosting with age-aware state feeding a newsvendor policy and a markdown trigger for near-expiry stock | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Waste percentage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Backtest ignores shelf-life state.
- Evaluation trap: Censored demand at stock-out.
- Supplier delivers poorer shelf life: produce arrives with less remaining life and spoils before the forecast sell-through.
- Heatwave: demand and spoilage shift.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
