# Volatility Forecasting for Risk & Options: use-case brief

> Generated from the blueprint `fintech/volatility-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Volatility Forecasting for Risk & Options · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast 1-day to 3-month volatility per instrument for VaR, margining and options pricing with calibrated coverage. The system has to run as a scheduled batch job, inside these limits: Coverage tests for VaR (Kupiec), Nightly for 50k instruments and Intraday refresh for top 500.

**Why it is hard.** The obvious approach is complex nets without baseline, and it fails because deep nets often fail to beat HAR on realised variance. The second trap is in "Target": the real signal is realised variance from intraday data, while teams usually reach for squared daily returns.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $1.8K a month. A mistake is expensive in the way risk limit breaches measures it.

**What success looks like.** Offline: QLIKE loss and VaR exception rate vs nominal. Online: Margin efficiency and Risk limit breaches. The launch is judged on "Margin efficiency" while "Risk limit breaches" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast 1-day to 3-month volatility per instrument for VaR, margining and options pricing with calibrated coverage.

**Training objective.** `\mathcal{L}=\sum_t\left[\log\hat\sigma_t^2+\frac{r_t^2}{\hat\sigma_t^2}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{\sigma}_t^2 | The model's forecast of volatility (standard deviation of returns); its square is the variance. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| r_t^2 | The asset's return at time t. |

**Hard constraints**

- Coverage tests for VaR (Kupiec)
- Nightly for 50k instruments
- Intraday refresh for top 500
- Model governance

## The approach in one paragraph

Start with hAR-RV regression on realised variance. Then earn the move to hAR features plus LSTM residual correction and implied-vol inputs, with conformal intervals and nightly coverage backtests, and only if it beats the baseline on QLIKE loss and VaR exception rate vs nominal after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Realised variance components | Daily, weekly, monthly RV averages. HAR structure. Guard against: intraday RV needs clean tick data. |
| Add Jump component | Bipower variation difference. Separates jumps from diffusion. Guard against: use consistent sampling frequency. |
| Add Implied vol term structure | At-the-money implied vol by tenor. Forward-looking. Guard against: use end-of-day mid not stale quotes. |
| Run it as one pipeline | Tick data ingestion (Kafka and Parquet), Realised vol builder (Spark), Forecast model (HAR plus LSTM), Interval calibrator (conformal), Risk system publisher (VaR engine), Model validation (backtest of exceptions) and Governance log (audit store). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle bad ticks inflate realised vol | Robust filtering and outlier-aware estimators. |

**Deliberately not doing**

- Raw volume: co-moves with vol without added info.
- Previous-day sign of return: little vol information.

**How the approach is proven**

Prove it offline on QLIKE loss and VaR exception rate vs nominal using time-ordered splits, then online on "Margin efficiency" with "Risk limit breaches" as the guardrail. Watch for: Evaluating against squared returns instead of RV and Overlapping windows inflate significance.

## Baseline and production design

- **Baseline (build this first):** HAR-RV regression on realised variance.
- **Production design:** HAR features plus LSTM residual correction and implied-vol inputs, with conformal intervals and nightly coverage backtests.

## Why AI, and why this kind

**Why AI.** Forecast 1-day to 3-month volatility per instrument for VaR, margining and options pricing with calibrated coverage. The evidence that separates good from bad outcomes (Realised variance components, Jump component, Implied vol term structure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "complex nets without baseline" are what teams reach for first, and they fail because deep nets often fail to beat HAR on realised variance. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: HAR features plus LSTM residual correction and implied-vol inputs, with conformal intervals and nightly coverage backtests.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Realised variance components, Jump component, Implied vol term structure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: HAR-RV regression on realised variance | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| HAR features plus LSTM residual correction and implied-vol inputs, with conformal intervals and nightly coverage backtests | chosen | Meets the run-window envelope at $0.0098 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Margin efficiency) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating against squared returns instead of RV.
- Evaluation trap: Overlapping windows inflate significance.
- Bad ticks inflate realised vol: forecast explodes.
- Market holiday asymmetry: misaligned windows.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
