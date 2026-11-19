# Robo-Advisor Portfolio Optimization: use-case brief

> Generated from the blueprint `fintech/portfolio-optimization-risk-parity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Robo-Advisor Portfolio Optimization · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs. The system has to run as a scheduled batch job, inside these limits: Suitability rules per jurisdiction, Fractional shares and Tax-lot awareness.

**Why it is hard.** The obvious approach is plugging sample mean and covariance into mean-variance, and it fails because estimation error makes the optimiser an error maximiser. The second trap is in "Trading": the real signal is drift-threshold and tax-aware rebalancing, while teams usually reach for calendar rebalancing everyone monthly.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way tracking error to target measures it.

**What success looks like.** Offline: Out-of-sample volatility vs target and After-tax return in simulation. Online: Goal-achievement probability and Tracking error to target. The launch is judged on "Goal-achievement probability" while "Tracking error to target" must not get worse.

## Objective, loss and constraints

**Business objective.** Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs.

**Training objective.** `\min_w\; w^\top\Sigma w-\lambda\,\mu^\top w+\kappa\,\|w-w_0\|_1`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_w | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| w^\top | The portfolio weights: the share of capital held in each asset, the thing being optimised; w_0 is the current portfolio. |
| \Sigma | The covariance matrix of asset returns, which measures risk. |
| \lambda | How much expected return is valued against risk. |
| \mu^\top | The vector of expected asset returns. |
| \kappa | Penalty on trading away from the current portfolio, which limits turnover. |
| \\|x\\| | Norm: the sum of absolute changes in weights (turnover). |

**Hard constraints**

- Suitability rules per jurisdiction
- Fractional shares
- Tax-lot awareness
- Rebalance 10M portfolios nightly

## The approach in one paragraph

Start with target-date glide paths with threshold rebalancing. Then earn the move to black-Litterman with shrinkage risk, convex optimiser with turnover and tax constraints, user-level risk questionnaire calibrated via behaviour, and only if it beats the baseline on Out-of-sample volatility vs target and After-tax return in simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Shrunk covariance matrix | Ledoit-Wolf shrinkage on rolling returns. Stable risk estimate. Guard against: rolling window must not include rebalance date. |
| Add Drift from target | L1 distance of current weights to target. Trade trigger. Guard against: use pre-trade market values. |
| Add Tax-lot loss harvesting value | Unrealised loss available net of wash-sale rules. After-tax alpha. Guard against: check wash-sale window across accounts. |
| Run it as one pipeline | Account and holdings snapshot (core ledger), Risk model (shrinkage covariance), Optimiser (convex solver), Tax and constraint layer (lot-level rules), Order generator (batch trades) and Performance attribution (nightly report), with Compliance review off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle market crash with synchronized rebalancing | Staggered cohorts and liquidity-aware order slicing. |

**Deliberately not doing**

- Recent 1-month returns: chasing performance increases risk.
- Forecast of next-day price: not forecastable at useful accuracy.

**How the approach is proven**

Prove it offline on Out-of-sample volatility vs target and After-tax return in simulation using time-ordered splits, then online on "Goal-achievement probability" with "Tracking error to target" as the guardrail. Watch for: Backtest ignores taxes and transaction costs and Risk questionnaire answers treated as true risk capacity.

## Baseline and production design

- **Baseline (build this first):** Target-date glide paths with threshold rebalancing.
- **Production design:** Black-Litterman with shrinkage risk, convex optimiser with turnover and tax constraints, user-level risk questionnaire calibrated via behaviour.

## Why AI, and why this kind

**Why AI.** Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs. The evidence that separates good from bad outcomes (Shrunk covariance matrix, Drift from target, Tax-lot loss harvesting value) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "plugging sample mean and covariance into mean-variance" are what teams reach for first, and they fail because estimation error makes the optimiser an error maximiser. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Black-Litterman with shrinkage risk, convex optimiser with turnover and tax constraints, user-level risk questionnaire calibrated via behaviour.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Shrunk covariance matrix, Drift from target, Tax-lot loss harvesting value and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Target-date glide paths with threshold rebalancing | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Black-Litterman with shrinkage risk, convex optimiser with turnover and tax constraints, user-level risk questionnaire calibrated via behaviour | chosen | Meets the run-window envelope at $0.360 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Goal-achievement probability) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Backtest ignores taxes and transaction costs.
- Evaluation trap: Risk questionnaire answers treated as true risk capacity.
- Market crash with synchronized rebalancing: trading storms into illiquid ETFs.
- User changes risk tolerance mid-cycle: portfolio mismatched.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
