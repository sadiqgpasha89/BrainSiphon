# Net Interest Income Sensitivity Forecasting: use-case brief

> Generated from the blueprint `bfsi/net-interest-income-sensitivity-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Net Interest Income Sensitivity Forecasting · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast net interest income under rate scenarios using behavioural models for repricing, prepayment and deposits. The system has to run as a scheduled batch job, inside these limits: Monthly ALCO pack, Scenarios from the ALM policy and Reconcile to finance within 1%.

**Why it is hard.** The obvious approach is contractual repricing only, and it fails because behaviour changes the repricing profile in rising or falling cycles. The second trap is in "Balance sheet": the real signal is dynamic balance sheet with growth assumptions, while teams usually reach for a static balance sheet.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way hedge cost measures it.

**What success looks like.** Offline: NII forecast error by quarter and Beta calibration. Online: Variance of NII versus plan and Hedge cost. The launch is judged on "Variance of NII versus plan" while "Hedge cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast net interest income under rate scenarios using behavioural models for repricing, prepayment and deposits.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{MSE}(\hat{y}_t,y_t)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},y_t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.9} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Monthly ALCO pack
- Scenarios from the ALM policy
- Reconcile to finance within 1%
- Model assumptions documented

## The approach in one paragraph

Start with static repricing gap analysis with parallel shocks, because it is standard in ALM. Then earn the move to product-level behavioural models for beta and prepayment combined with a dynamic balance-sheet simulator and scenario fan charts, with attribution of NII change to drivers, and only if it beats the baseline on NII forecast error by quarter and Beta calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Deposit beta by product | Change in own rate per unit change in the policy rate. Core driver of NII. Guard against: beta is non-linear and lagged. |
| Add Prepayment speed | Monthly prepayment rate of the fixed book. Reinvestment risk. Guard against: depends on rate incentive. |
| Add Repricing gap | Assets minus liabilities repricing within each time bucket. Standard measure. Guard against: needs behavioural adjustments. |
| Run it as one pipeline | Balance sheet snapshot (finance data mart), Behaviour models (boosting per product), Scenario curve engine (treasury), NII simulator (Python on Spark), Attribution engine (variance decomposition) and ALCO dashboard (BI tool), with Run archive off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle negative rate regime | Apply floors in the behaviour models and a regime flag that moves the forecast to a stress mode. |

**Deliberately not doing**

- Customer age: weak.
- Channel: little effect.
- Currency pair labels: not informative for pass-through.

**How the approach is proven**

Prove it offline on NII forecast error by quarter and Beta calibration using time-ordered splits, then online on "Variance of NII versus plan" with "Hedge cost" as the guardrail. Watch for: Training in a falling-rate era understates deposit beta and Static balance sheet inflates stability.

## Baseline and production design

- **Baseline (build this first):** Static repricing gap analysis with parallel shocks, because it is standard in ALM.
- **Production design:** Product-level behavioural models for beta and prepayment combined with a dynamic balance-sheet simulator and scenario fan charts, with attribution of NII change to drivers.

## Why AI, and why this kind

**Why AI.** Forecast net interest income under rate scenarios using behavioural models for repricing, prepayment and deposits. The evidence that separates good from bad outcomes (Deposit beta by product, Prepayment speed, Repricing gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "contractual repricing only" are what teams reach for first, and they fail because behaviour changes the repricing profile in rising or falling cycles. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Product-level behavioural models for beta and prepayment combined with a dynamic balance-sheet simulator and scenario fan charts, with attribution of NII change to drivers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Deposit beta by product, Prepayment speed, Repricing gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static repricing gap analysis with parallel shocks, because it is standard in ALM | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Product-level behavioural models for beta and prepayment combined with a dynamic balance-sheet simulator and scenario fan charts, with attribution of NII change to drivers | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Variance of NII versus plan) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training in a falling-rate era understates deposit beta.
- Evaluation trap: Static balance sheet inflates stability.
- Negative rate regime: behavioural assumptions such as deposit pass-through break when rates go below zero.
- Large one-off prepayments: a pool pays out in one month.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
