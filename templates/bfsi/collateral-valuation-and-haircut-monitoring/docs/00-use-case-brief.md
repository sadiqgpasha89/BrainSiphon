# Collateral Valuation & Haircut Monitoring: use-case brief

> Generated from the blueprint `bfsi/collateral-valuation-and-haircut-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Collateral Valuation & Haircut Monitoring · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up. The system has to run as a scheduled batch job, inside these limits: Daily revaluation before the margin cut-off, Haircuts follow the board-approved policy bounds and Independent price sources for assets with no market.

**Why it is hard.** The obvious approach is mean valuation, and it fails because the mean hides the loss given a stress sale. The second trap is in "Liquidity": the real signal is time-to-sell and bid-ask for the asset class, while teams usually reach for treating all collateral as liquid.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way margin calls disputed because of valuation measures it.

**What success looks like.** Offline: Coverage of the 95% quantile on back-tests and Valuation error against realised sale price. Online: Under-secured exposure days and Margin calls disputed because of valuation. The launch is judged on "Under-secured exposure days" while "Margin calls disputed because of valuation" must not get worse.

## Objective, loss and constraints

**Business objective.** Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{Huber}(y_t-\hat{y}_t)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.05},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.05} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Daily revaluation before the margin cut-off
- Haircuts follow the board-approved policy bounds
- Independent price sources for assets with no market
- Explainable to credit risk and audit

## The approach in one paragraph

Start with static haircut table by asset class with annual valuation, because it is the policy default and auditors expect it. Then earn the move to quantile regression and volatility models for liquid assets, indexed valuation for property and private assets with stale-value penalties, and a haircut recommender capped by policy bounds, and only if it beats the baseline on Coverage of the 95% quantile on back-tests and Valuation error against realised sale price after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Price momentum and volatility | 20-day return and realised volatility of the reference price. Rising volatility widens haircuts. Guard against: use settlement prices, not stale quotes. |
| Add Liquidity proxy | Traded volume and quoted spread over 30 days. Illiquid assets need larger haircuts. Guard against: volumes are missing for private assets. |
| Add Valuation age | Days since the last independent valuation. Stale values drift from reality. Guard against: ageing must use the valuation date, not the booking date. |
| Run it as one pipeline | Price feed ingest (market data vendors), Asset reference data (collateral register), Valuation model (quantile gradient boosting), Haircut calculator (policy rules engine), Margin call generator (workflow) and Valuation history (lakehouse), with Exception reviewer off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle price feed outage | Fallback to the last good price with an age penalty and an alert. |

**Deliberately not doing**

- Collateral description free text: inconsistent wording, replaced by coded types.
- Loan officer identifier: not related to collateral value.
- Original appraiser name: proxy for cohort, not value.

**How the approach is proven**

Prove it offline on Coverage of the 95% quantile on back-tests and Valuation error against realised sale price using time-ordered splits, then online on "Under-secured exposure days" with "Margin calls disputed because of valuation" as the guardrail. Watch for: Back-test on calm markets misses stressed haircuts and Sale prices selection bias, only defaulted loans are sold.

## Baseline and production design

- **Baseline (build this first):** Static haircut table by asset class with annual valuation, because it is the policy default and auditors expect it.
- **Production design:** Quantile regression and volatility models for liquid assets, indexed valuation for property and private assets with stale-value penalties, and a haircut recommender capped by policy bounds.

## Why AI, and why this kind

**Why AI.** Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up. The evidence that separates good from bad outcomes (Price momentum and volatility, Liquidity proxy, Valuation age) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "mean valuation" are what teams reach for first, and they fail because the mean hides the loss given a stress sale. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Quantile regression and volatility models for liquid assets, indexed valuation for property and private assets with stale-value penalties, and a haircut recommender capped by policy bounds.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Price momentum and volatility, Liquidity proxy, Valuation age and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static haircut table by asset class with annual valuation, because it is the policy default and auditors expect it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile regression and volatility models for liquid assets, indexed valuation for property and private assets with stale-value penalties, and a haircut recommender capped by policy bounds | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Under-secured exposure days) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Back-test on calm markets misses stressed haircuts.
- Evaluation trap: Sale prices selection bias, only defaulted loans are sold.
- Price feed outage: collateral is valued at yesterday's price.
- Fire sale: forced selling widens spreads beyond the model.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
