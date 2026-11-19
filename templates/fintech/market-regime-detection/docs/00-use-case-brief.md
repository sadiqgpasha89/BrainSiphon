# Market Regime Detection: use-case brief

> Generated from the blueprint `fintech/market-regime-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Market Regime Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify volatility and correlation regimes early so risk limits and strategy weights adapt before drawdowns compound. The system has to run as a scheduled batch job, inside these limits: Decision lag under 1 day, Interpretable regime labels and Low false switching.

**Why it is hard.** The obvious approach is thresholds on VIX, and it fails because single-indicator thresholds whipsaw at boundaries. The second trap is in "Lag": the real signal is posterior regime probabilities used probabilistically, while teams usually reach for hard labels from smoothed fits.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way turnover cost of regime switching measures it.

**What success looks like.** Offline: Regime-conditional return separation and Switching frequency. Online: Drawdown reduction vs static and Turnover cost of regime switching. The launch is judged on "Drawdown reduction vs static" while "Turnover cost of regime switching" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify volatility and correlation regimes early so risk limits and strategy weights adapt before drawdowns compound.

**Training objective.** `\log p(x_{1:T})=\log\sum_{s_{1:T}}\prod_t p(s_t\mid s_{t-1})\,p(x_t\mid s_t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p | A probability: p(s_t \| s_{t-1}) is the chance of switching regimes and p(x_t \| s_t) is how likely the data is in each regime. |
| x_{1:T} | The observed market data at time t; x_{1:T} is the whole series. |
| \sum_{s_{1:T}} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \prod_t | Product: multiply the term over every value of the index written under it. |
| s_t | The hidden market regime (such as calm or turbulent) at time t. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |

**Hard constraints**

- Decision lag under 1 day
- Interpretable regime labels
- Low false switching
- Regime history reproducible

## The approach in one paragraph

Start with rule-based volatility bands. Then earn the move to bayesian hidden Markov model with sticky-HDP priors on multi-asset features, filtered (not smoothed) probabilities feeding risk limits, and only if it beats the baseline on Regime-conditional return separation and Switching frequency after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Realised vs implied vol spread | 20d realised vol minus implied vol. Stress onset signal. Guard against: align timestamps across sources. |
| Add Cross-asset correlation spike | Rolling average pairwise correlation. Diversification failure. Guard against: window excludes decision day close. |
| Add Credit spread momentum | 5-day change in IG-HY spread. Risk-off indicator. Guard against: use as-published spreads. |
| Run it as one pipeline | Market data feed (vendor API), Feature builder (rolling windows), Regime filter (Bayesian HMM), Probability publisher (risk service) and Limit adjuster (risk rules), with Risk committee review and Regime audit off the critical path. |
| Optimise the right thing | The objective weighs natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily, so the model is trained on the cost of the decision and not on a generic score. |
| Handle flash crash day | Minimum dwell time and robust features. |

**Deliberately not doing**

- Calendar month: spurious seasonality.
- Single-day return extremes: outliers without persistence.

**How the approach is proven**

Prove it offline on Regime-conditional return separation and Switching frequency using time-ordered splits, then online on "Drawdown reduction vs static" with "Turnover cost of regime switching" as the guardrail. Watch for: Using smoothed state probabilities in backtests and Regimes defined with hindsight.

## Baseline and production design

- **Baseline (build this first):** Rule-based volatility bands.
- **Production design:** Bayesian hidden Markov model with sticky-HDP priors on multi-asset features, filtered (not smoothed) probabilities feeding risk limits.

## Why AI, and why this kind

**Why AI.** Identify volatility and correlation regimes early so risk limits and strategy weights adapt before drawdowns compound. The evidence that separates good from bad outcomes (Realised vs implied vol spread, Cross-asset correlation spike, Credit spread momentum) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "thresholds on VIX" are what teams reach for first, and they fail because single-indicator thresholds whipsaw at boundaries. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Bayesian hidden Markov model with sticky-HDP priors on multi-asset features, filtered (not smoothed) probabilities feeding risk limits.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Realised vs implied vol spread, Cross-asset correlation spike, Credit spread momentum and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based volatility bands | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian hidden Markov model with sticky-HDP priors on multi-asset features, filtered (not smoothed) probabilities feeding risk limits | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Drawdown reduction vs static) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using smoothed state probabilities in backtests.
- Evaluation trap: Regimes defined with hindsight.
- Flash crash day: model flips regime on one print.
- New asset class enters: feature set changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
