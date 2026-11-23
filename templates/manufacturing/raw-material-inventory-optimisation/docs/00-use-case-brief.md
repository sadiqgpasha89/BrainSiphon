# Raw Material Inventory Optimisation: use-case brief

> Generated from the blueprint `manufacturing/raw-material-inventory-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Raw Material Inventory Optimisation · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory. The system has to run as a scheduled batch job, inside these limits: Service level targets by criticality, Supplier minimum order quantities respected and Planner approves order proposals.

**Why it is hard.** The obvious approach is average values, and it fails because averages hide the tail that causes stock-outs. The second trap is in "Policy": the real signal is service level tied to the cost of shortage, while teams usually reach for one level for all.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.8K a month. A mistake is expensive in the way inventory value measures it.

**What success looks like.** Offline: Simulated service level against target, Stock-out rate and Inventory value at fixed service. Online: Stock-outs, Inventory value and Expedite orders. The launch is judged on "Stock-outs" while "Inventory value" must not get worse.

## Objective, loss and constraints

**Business objective.** Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Service level targets by criticality
- Supplier minimum order quantities respected
- Planner approves order proposals
- Weekly run for 60K materials

## The approach in one paragraph

Start with reorder-point rules from average usage and a safety factor, because it is the standard practice. Then earn the move to a stochastic inventory policy with simulated demand and lead times, optimised against shortage and holding costs with constraints, and a proposal list for buyers, and only if it beats the baseline on Simulated service level against target and Stock-out rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Demand forecast with intervals | Quantile forecast from the production plan. Demand uncertainty. Guard against: from planning. |
| Add Lead time distribution | Supplier median and p90 lead time. Replenishment risk. Guard against: from receipts. |
| Add Shelf life and storage limits | Days of life left and capacity. Constraints. Guard against: from the material master. |
| Run it as one pipeline | Demand and receipts (ERP), Distribution fitting (statistical models), Policy optimiser (stochastic simulation), Constraint filter (rules), Order proposals (planning tool), Buyer approval (procurement console) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supplier disruption | Scenario planning and dual sourcing rules. |

**Deliberately not doing**

- Buyer name: irrelevant.
- Warehouse code: an identifier.
- Order number: an identifier.

**How the approach is proven**

Prove it offline on Simulated service level against target, Stock-out rate and Inventory value at fixed service using time-ordered splits, then online on "Stock-outs" with "Inventory value" as the guardrail. Watch for: Average-based safety stock, One service level for all and Ignoring shelf life.

## Baseline and production design

- **Baseline (build this first):** Reorder-point rules from average usage and a safety factor, because it is the standard practice.
- **Production design:** A stochastic inventory policy with simulated demand and lead times, optimised against shortage and holding costs with constraints, and a proposal list for buyers.

## Why AI, and why this kind

**Why AI.** Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory. The evidence that separates good from bad outcomes (Demand forecast with intervals, Lead time distribution, Shelf life and storage limits) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average values" are what teams reach for first, and they fail because averages hide the tail that causes stock-outs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A stochastic inventory policy with simulated demand and lead times, optimised against shortage and holding costs with constraints, and a proposal list for buyers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Demand forecast with intervals, Lead time distribution, Shelf life and storage limits and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reorder-point rules from average usage and a safety factor, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A stochastic inventory policy with simulated demand and lead times, optimised against shortage and holding costs with constraints, and a proposal list for buyers | chosen | Meets the run-window envelope at $0.039 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Stock-outs) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Average-based safety stock.
- Evaluation trap: One service level for all.
- Supplier disruption: lead times jump.
- Demand change: the production plan shifts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
