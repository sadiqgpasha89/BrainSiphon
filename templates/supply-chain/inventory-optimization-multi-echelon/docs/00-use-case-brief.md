# Multi-Echelon Inventory Optimisation: use-case brief

> Generated from the blueprint `supply-chain/inventory-optimization-multi-echelon` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Multi-Echelon Inventory Optimisation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Set stocking levels across plants, DCs and stores to hit service targets at minimal total inventory investment. The system has to run as a scheduled batch job, inside these limits: Lead-time variability, Echelon service levels and Working-capital targets.

**Why it is hard.** The obvious approach is independent location safety stocks, and it fails because independent buffers over-stock the network. The second trap is in "Variability": the real signal is lead-time and forecast-error distributions, while teams usually reach for mean-based rules.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way fill rate measures it.

**What success looks like.** Offline: Simulated service level vs inventory and Cost vs baseline policy. Online: Inventory days of supply and Fill rate. The launch is judged on "Inventory days of supply" while "Fill rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Set stocking levels across plants, DCs and stores to hit service targets at minimal total inventory investment.

**Training objective.** `\min\;\sum_{n}h_n\,\mathbb{E}[I_n^+]\ \text{s.t. }\Pr(\text{stockout}_n)\le\alpha_n`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{n} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| h_n | The holding cost per unit at node n of the supply network. |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| I_n^+ | Inventory at node n: I^+ is the stock on hand. |
| \Pr | Probability of the event written inside the brackets. |
| \text{stockout}_n | The event that node n runs out of stock; its probability must stay below alpha_n. |
| \alpha_n | The maximum acceptable stock-out probability at node n. |

**Hard constraints**

- Lead-time variability
- Echelon service levels
- Working-capital targets
- Quarterly policy refresh

## The approach in one paragraph

Start with single-echelon safety stock formula per node. Then earn the move to stochastic multi-echelon optimiser with learned demand and lead-time distributions validated by network simulation, and only if it beats the baseline on Simulated service level vs inventory and Cost vs baseline policy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Demand forecast error distribution | Residuals by horizon. Uncertainty. Guard against: forecast backtest. |
| Add Replenishment lead-time distribution | Empirical quantiles. Buffer sizing. Guard against: delivered times. |
| Add Holding cost and criticality | Cost and service class. Trade-off. Guard against: finance data. |
| Run it as one pipeline | Network data (ERP), Distribution estimators (forecasting), Multi-echelon optimiser (stochastic program), Simulator (discrete-event sim), Policy publisher (planning tools), Inventory planner (human) and Service KPIs (tracking). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle single-sourced component disrupted | Disruption scenarios in optimisation. |

**Deliberately not doing**

- SKU code: none.
- Planner: none.

**How the approach is proven**

Prove it offline on Simulated service level vs inventory and Cost vs baseline policy using time-ordered splits, then online on "Inventory days of supply" with "Fill rate" as the guardrail. Watch for: Normal-distribution assumptions on skewed demand and Not simulating the policy before launch.

## Baseline and production design

- **Baseline (build this first):** Single-echelon safety stock formula per node.
- **Production design:** Stochastic multi-echelon optimiser with learned demand and lead-time distributions validated by network simulation.

## Why AI, and why this kind

**Why AI.** Set stocking levels across plants, DCs and stores to hit service targets at minimal total inventory investment. The evidence that separates good from bad outcomes (Demand forecast error distribution, Replenishment lead-time distribution, Holding cost and criticality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "independent location safety stocks" are what teams reach for first, and they fail because independent buffers over-stock the network. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Stochastic multi-echelon optimiser with learned demand and lead-time distributions validated by network simulation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Demand forecast error distribution, Replenishment lead-time distribution, Holding cost and criticality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Single-echelon safety stock formula per node | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Stochastic multi-echelon optimiser with learned demand and lead-time distributions validated by network simulation | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Inventory days of supply) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Normal-distribution assumptions on skewed demand.
- Evaluation trap: Not simulating the policy before launch.
- Single-sourced component disrupted: policy assumes normal lead times.
- Forecast bias changes after a promotion strategy: a new promotion strategy changes forecast bias so the buffers are sized from wrong errors.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
