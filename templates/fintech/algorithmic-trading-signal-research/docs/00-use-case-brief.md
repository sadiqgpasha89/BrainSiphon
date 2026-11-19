# Alpha Signal Research Pipeline: use-case brief

> Generated from the blueprint `fintech/algorithmic-trading-signal-research` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Alpha Signal Research Pipeline · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Discover and validate cross-sectional return signals that survive costs and decay, and promote them to production with strict overfitting control. The system has to run as a scheduled batch job, inside these limits: Point-in-time universe including delisted names, Transaction-cost-aware evaluation and Capacity limits.

**Why it is hard.** The obvious approach is choosing the best of 500 backtests, and it fails because the best of many random signals always looks great. The second trap is in "Costs": the real signal is net-of-cost returns with realistic impact, while teams usually reach for gross backtest Sharpe.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way information coefficient decay measures it.

**What success looks like.** Offline: Net Sharpe after costs and Deflated Sharpe ratio. Online: Live vs backtest slippage gap and Information coefficient decay. The launch is judged on "Live vs backtest slippage gap" while "Information coefficient decay" must not get worse.

## Objective, loss and constraints

**Business objective.** Discover and validate cross-sectional return signals that survive costs and decay, and promote them to production with strict overfitting control.

**Training objective.** `\mathcal{L}=\sum_{t}\left(r_{t+h}-\hat r_{t+h}\right)^2+\lambda\,\mathrm{Turnover}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| r_{t+h} | The asset's return h steps ahead: r_{t+h} is the realised return and its hat the model's forecast. |
| \hat{r}_{t+h} | The model's predicted value of the quantity r. (one value per time step or token t and forecast step h) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Turnover} | Penalty on how much the portfolio trades, since trading costs eat returns. |

**Hard constraints**

- Point-in-time universe including delisted names
- Transaction-cost-aware evaluation
- Capacity limits
- Reproducible research environment

## The approach in one paragraph

Start with single-factor ranked long-short portfolios. Then earn the move to gradient-boosted cross-sectional model on 60 neutralised factors with purged walk-forward CV, deflated Sharpe gating and an execution-cost model, and only if it beats the baseline on Net Sharpe after costs and Deflated Sharpe ratio after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Cross-sectional rank momentum | Rank of 12-1 month return across the universe. Documented persistent premium. Guard against: skip the most recent month to avoid reversal contamination. |
| Add Earnings surprise drift | Standardised surprise vs consensus at announcement. Post-announcement drift. Guard against: use consensus snapshot before the release. |
| Add Liquidity-adjusted turnover | Alpha divided by participation-rate cost estimate. Capacity realism. Guard against: volume must be same-period not future. |
| Run it as one pipeline | Market data lake (point-in-time store), Factor engine (Spark), Model trainer (purged walk-forward GBDT), Backtester (cost-aware simulator), Promotion gate (deflated Sharpe check), Portfolio constructor (optimiser) and Live performance tracker (attribution). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle delisting and survivorship | Use survivorship-free point-in-time universe. |

**Deliberately not doing**

- Raw price level: not stationary, no cross-sectional meaning.
- Last-day return: microstructure noise that reverses.

**How the approach is proven**

Prove it offline on Net Sharpe after costs and Deflated Sharpe ratio using time-ordered splits, then online on "Live vs backtest slippage gap" with "Information coefficient decay" as the guardrail. Watch for: Look-ahead via restated fundamentals and Hyperparameters tuned on the test period.

## Baseline and production design

- **Baseline (build this first):** Single-factor ranked long-short portfolios.
- **Production design:** Gradient-boosted cross-sectional model on 60 neutralised factors with purged walk-forward CV, deflated Sharpe gating and an execution-cost model.

## Why AI, and why this kind

**Why AI.** Discover and validate cross-sectional return signals that survive costs and decay, and promote them to production with strict overfitting control. The evidence that separates good from bad outcomes (Cross-sectional rank momentum, Earnings surprise drift, Liquidity-adjusted turnover) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "choosing the best of 500 backtests" are what teams reach for first, and they fail because the best of many random signals always looks great. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Gradient-boosted cross-sectional model on 60 neutralised factors with purged walk-forward CV, deflated Sharpe gating and an execution-cost model.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Cross-sectional rank momentum, Earnings surprise drift, Liquidity-adjusted turnover and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Single-factor ranked long-short portfolios | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted cross-sectional model on 60 neutralised factors with purged walk-forward CV, deflated Sharpe gating and an execution-cost model | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Live vs backtest slippage gap) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Look-ahead via restated fundamentals.
- Evaluation trap: Hyperparameters tuned on the test period.
- Delisting and survivorship: backtest ignores failed companies.
- Factor crowding event: signal decays rapidly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
