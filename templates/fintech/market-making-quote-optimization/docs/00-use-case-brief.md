# Market-Making Quote Optimisation: use-case brief

> Generated from the blueprint `fintech/market-making-quote-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Market-Making Quote Optimisation · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Quote bid and ask prices that earn spread while controlling inventory and adverse selection. The system has to run in under 10 milliseconds, inside these limits: Quote update under 1 ms, Inventory and loss limits and Exchange message rate caps.

**Why it is hard.** The obvious approach is spread alone, and it fails because capturing spread against informed flow loses money. The second trap is in "Inventory": the real signal is inventory-aware skewing of quotes, while teams usually reach for symmetric quotes.

**Scale and stakes.** At 10 million users this is about 300.0M model-touching events a day, 3.5K requests per second on average and 27.8K at peak, at an estimated $11.1K a month. A mistake is expensive in the way adverse selection cost measures it.

**What success looks like.** Offline: Sharpe in market-replay simulation and Fill toxicity calibration. Online: PnL per unit risk and Adverse selection cost. The launch is judged on "PnL per unit risk" while "Adverse selection cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Quote bid and ask prices that earn spread while controlling inventory and adverse selection.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\text{PnL}_T-\phi\int_0^T q_t^2\,dt\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{PnL}_T | Profit and loss earned by time T. |
| \phi | Penalty strength on holding inventory. |
| \int_0^T | Integral: add up a continuously varying quantity over the range shown. |
| q_t^2 | The inventory (net position) the market maker holds at time t. |
| d | The integration variable dt: a tiny step in time. |
| t | Time step, or token position in a text sequence. |

**Hard constraints**

- Quote update under 1 ms
- Inventory and loss limits
- Exchange message rate caps
- Kill switch within 100 ms

## The approach in one paragraph

Start with avellaneda-Stoikov closed-form quoting. Then earn the move to avellaneda-Stoikov baseline plus an RL policy modulating skew and spread via learned toxicity features, with hard risk wrappers, and only if it beats the baseline on Sharpe in market-replay simulation and Fill toxicity calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Queue position and size | Estimated position in queue at best price. Fill probability. Guard against: estimate from own order events. |
| Add Short-term trade imbalance | Signed volume over last 100 ms. Toxicity predictor. Guard against: use exchange-timestamp ordering. |
| Add Inventory skew | Quote shift proportional to inventory. Risk control. Guard against: cap by hard limits. |
| Run it as one pipeline | Feed handler (UDP multicast), Microstructure features (FPGA or C++), Quote policy (small MLP), Risk wrapper (inventory and loss limits), Order entry (exchange binary protocol), Kill-switch monitor (independent process) and Offline replay (simulator). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle exchange sends stale data | Sequence-gap detection with quote pull. |

**Deliberately not doing**

- Long-horizon price predictions: not actionable at quote horizon.
- News sentiment: too slow for quote decisions.

**How the approach is proven**

Prove it offline on Sharpe in market-replay simulation and Fill toxicity calibration using time-ordered splits, then online on "PnL per unit risk" with "Adverse selection cost" as the guardrail. Watch for: Replay ignores queue position effects and Overfitting to a single instrument.

## Baseline and production design

- **Baseline (build this first):** Avellaneda-Stoikov closed-form quoting.
- **Production design:** Avellaneda-Stoikov baseline plus an RL policy modulating skew and spread via learned toxicity features, with hard risk wrappers.

## Why AI, and why this kind

**Why AI.** Quote bid and ask prices that earn spread while controlling inventory and adverse selection. The evidence that separates good from bad outcomes (Queue position and size, Short-term trade imbalance, Inventory skew) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "spread alone" are what teams reach for first, and they fail because capturing spread against informed flow loses money. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Avellaneda-Stoikov baseline plus an RL policy modulating skew and spread via learned toxicity features, with hard risk wrappers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Queue position and size, Short-term trade imbalance, Inventory skew and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Avellaneda-Stoikov closed-form quoting | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Avellaneda-Stoikov baseline plus an RL policy modulating skew and spread via learned toxicity features, with hard risk wrappers | chosen | Meets the 8 ms envelope at $0.0012 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (PnL per unit risk) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replay ignores queue position effects.
- Evaluation trap: Overfitting to a single instrument.
- Exchange sends stale data: quotes against old prices.
- Latency spike in order entry: stale quotes picked off.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
