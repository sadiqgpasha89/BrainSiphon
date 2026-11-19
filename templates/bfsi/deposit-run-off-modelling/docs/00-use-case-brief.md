# Deposit Run-Off Modelling: use-case brief

> Generated from the blueprint `bfsi/deposit-run-off-modelling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Deposit Run-Off Modelling · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate how fast deposits leave under rate moves and stress so liquidity buffers and funding plans are set with evidence. The system has to run as a scheduled batch job, inside these limits: Regulatory liquidity coverage assumptions as bounds, Model validated annually and Stable and non-stable splits explainable.

**Why it is hard.** The obvious approach is treating all balances alike, and it fails because rate-sensitive balances leave with a lag and in size. The second trap is in "Stress": the real signal is run-off in the worst historical and hypothetical scenarios, while teams usually reach for average attrition.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way forecast error in stressed months measures it.

**What success looks like.** Offline: Back-test of run-off by segment and Coverage of the 95% quantile. Online: Liquidity buffer cost and Forecast error in stressed months. The launch is judged on "Liquidity buffer cost" while "Forecast error in stressed months" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate how fast deposits leave under rate moves and stress so liquidity buffers and funding plans are set with evidence.

**Training objective.** `\mathcal{L}=\sum_i\mathrm{Huber}(y_i-\hat{y}_i)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.95},y_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \hat{y}_i | The model's prediction of y. (one value per example i) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.95} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Regulatory liquidity coverage assumptions as bounds
- Model validated annually
- Stable and non-stable splits explainable
- Monthly refresh

## The approach in one paragraph

Start with regulatory run-off rates by deposit class, because they are the reference and are accepted by supervisors. Then earn the move to survival and quantile models by segment on balance and customer features with scenario drivers (rate paths, competitor moves), producing run-off curves with intervals, and only if it beats the baseline on Back-test of run-off by segment and Coverage of the 95% quantile after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rate gap | Own deposit rate minus the best competitor rate for the segment. Customers move when the gap is large. Guard against: competitor rates are collected irregularly. |
| Add Balance volatility | 90-day coefficient of variation of the account balance. Volatile balances are less stable. Guard against: salary accounts look volatile around payday. |
| Add Product and tenure | Account age and number of active products. Multi-product customers are stickier. Guard against: needs consistent product mapping. |
| Run it as one pipeline | Deposit ledger (core banking extract), Customer features (Spark), Rate-gap service (market data), Run-off model (survival and quantile boosting), Scenario engine (treasury paths), Liquidity planner (ALM tooling) and Validation pack (model risk). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle social-media-driven bank run | Tail scenarios with speed assumptions and intraday triggers. |

**Deliberately not doing**

- Account number: arbitrary identifier.
- Branch: administrative.
- Marketing source: cohort effect.

**How the approach is proven**

Prove it offline on Back-test of run-off by segment and Coverage of the 95% quantile using time-ordered splits, then online on "Liquidity buffer cost" with "Forecast error in stressed months" as the guardrail. Watch for: Training on a rate-stable era understates sensitivity and Customer-level splits leak households.

## Baseline and production design

- **Baseline (build this first):** Regulatory run-off rates by deposit class, because they are the reference and are accepted by supervisors.
- **Production design:** Survival and quantile models by segment on balance and customer features with scenario drivers (rate paths, competitor moves), producing run-off curves with intervals.

## Why AI, and why this kind

**Why AI.** Estimate how fast deposits leave under rate moves and stress so liquidity buffers and funding plans are set with evidence. The evidence that separates good from bad outcomes (Rate gap, Balance volatility, Product and tenure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "treating all balances alike" are what teams reach for first, and they fail because rate-sensitive balances leave with a lag and in size. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Survival and quantile models by segment on balance and customer features with scenario drivers (rate paths, competitor moves), producing run-off curves with intervals.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rate gap, Balance volatility, Product and tenure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Regulatory run-off rates by deposit class, because they are the reference and are accepted by supervisors | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Survival and quantile models by segment on balance and customer features with scenario drivers (rate paths, competitor moves), producing run-off curves with intervals | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Liquidity buffer cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on a rate-stable era understates sensitivity.
- Evaluation trap: Customer-level splits leak households.
- Social-media-driven bank run: outflows far exceed history.
- Product migration: customers move between internal products.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
