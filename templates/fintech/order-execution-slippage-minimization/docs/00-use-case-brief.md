# Order Execution & Slippage Minimisation: use-case brief

> Generated from the blueprint `fintech/order-execution-slippage-minimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Order Execution & Slippage Minimisation · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Slice large parent orders into child orders that minimise implementation shortfall against arrival price. The system has to run in under 10 milliseconds, inside these limits: Decision latency under 2 ms, Participation caps and Fat-finger protection.

**Why it is hard.** The obvious approach is vWAP beat rate, and it fails because vWAP can be gamed by trading late with the market. The second trap is in "Simulation": the real signal is calibrated limit-order-book simulator with impact, while teams usually reach for replaying historical fills.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 5.6K at peak, at an estimated $4.3K a month. A mistake is expensive in the way fill rate measures it.

**What success looks like.** Offline: Shortfall vs benchmark in simulator and Sim-to-real gap on shadow trades. Online: Average slippage in basis points and Fill rate. The launch is judged on "Average slippage in basis points" while "Fill rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Slice large parent orders into child orders that minimise implementation shortfall against arrival price.

**Training objective.** `\min_\pi\;\mathbb{E}\!\left[\sum_t \text{impact}_t(q_t)+\lambda\,\text{risk}_t\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_\pi | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{impact}_t | The market impact cost of trading q_t units at step t. |
| q_t | The quantity traded at step t. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{risk}_t | The price risk of holding the unexecuted order at step t. |

**Hard constraints**

- Decision latency under 2 ms
- Participation caps
- Fat-finger protection
- Best-execution reporting

## The approach in one paragraph

Start with almgren-Chriss schedule with a TWAP fallback. Then earn the move to pPO policy trained in an LOB simulator with domain randomisation, wrapped by hard participation and price-limit constraints, running on FPGA-adjacent hosts, and only if it beats the baseline on Shortfall vs benchmark in simulator and Sim-to-real gap on shadow trades after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Order-book imbalance | (bid depth - ask depth) / total depth at top 5 levels. Short-term price pressure. Guard against: snapshot at decision time. |
| Add Spread and depth ratio | Spread over mid and depth at touch. Liquidity cost. Guard against: use pre-trade quotes only. |
| Add Remaining-time urgency | Residual quantity over remaining horizon. Schedule pressure. Guard against: normalise by expected volume curve. |
| Run it as one pipeline | Market data handler (kernel-bypass feed), State encoder (LOB features), Execution policy (ONNX PPO), Risk guard (hard limits), Order gateway (FIX), Post-trade TCA (analytics) and Policy trainer (simulator). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle venue outage mid-order | Heartbeat monitor and auto-cancel with schedule rebalance. |

**Deliberately not doing**

- Order sizes of other participants: not observable reliably.
- Time-of-day dummies: captured by the volume curve.

**How the approach is proven**

Prove it offline on Shortfall vs benchmark in simulator and Sim-to-real gap on shadow trades using time-ordered splits, then online on "Average slippage in basis points" with "Fill rate" as the guardrail. Watch for: Simulator lacks market impact and Training on one volatility regime.

## Baseline and production design

- **Baseline (build this first):** Almgren-Chriss schedule with a TWAP fallback.
- **Production design:** PPO policy trained in an LOB simulator with domain randomisation, wrapped by hard participation and price-limit constraints, running on FPGA-adjacent hosts.

## Why AI, and why this kind

**Why AI.** Slice large parent orders into child orders that minimise implementation shortfall against arrival price. The evidence that separates good from bad outcomes (Order-book imbalance, Spread and depth ratio, Remaining-time urgency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "VWAP beat rate" are what teams reach for first, and they fail because VWAP can be gamed by trading late with the market. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: PPO policy trained in an LOB simulator with domain randomisation, wrapped by hard participation and price-limit constraints, running on FPGA-adjacent hosts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Order-book imbalance, Spread and depth ratio, Remaining-time urgency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Almgren-Chriss schedule with a TWAP fallback | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| PPO policy trained in an LOB simulator with domain randomisation, wrapped by hard participation and price-limit constraints, running on FPGA-adjacent hosts | chosen | Meets the 8 ms envelope at $0.0024 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Average slippage in basis points) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulator lacks market impact.
- Evaluation trap: Training on one volatility regime.
- Venue outage mid-order: stuck child orders.
- Volatility spike beyond training range: policy acts out of distribution.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
