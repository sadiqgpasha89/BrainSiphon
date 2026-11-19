# Supply-Aligned Demand Shaping: use-case brief

> Generated from the blueprint `supply-chain/demand-shaping-supply-aligned` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supply-Aligned Demand Shaping · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste. The system has to run as a scheduled batch job, inside these limits: Brand price rules, Promotion calendars locked weeks ahead and Supply plan visibility.

**Why it is hard.** The obvious approach is independent promo and supply planning, and it fails because promotions that ignore supply cause stock-outs. The second trap is in "Causality": the real signal is causal promo uplift per item, while teams usually reach for correlation of promo and sales.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way waste on promoted items measures it.

**What success looks like.** Offline: Simulated margin and service level and Uplift calibration. Online: Stock-outs during promotions and Waste on promoted items. The launch is judged on "Stock-outs during promotions" while "Waste on promoted items" must not get worse.

## Objective, loss and constraints

**Business objective.** Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t \text{margin}_t-\lambda\,\text{unmet}_t-\mu\,\text{excess}_t\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{margin}_t | Margin earned at step t. |
| \lambda | Weight on unmet demand: how strongly it counts against the main objective. |
| \text{unmet}_t | Demand that could not be served at step t. |
| \mu | Weight on excess supply: how strongly it counts against the main objective. |
| \text{excess}_t | Excess supply left over at step t. |

**Hard constraints**

- Brand price rules
- Promotion calendars locked weeks ahead
- Supply plan visibility
- Fairness

## The approach in one paragraph

Start with promotion calendar set by category managers. Then earn the move to causal uplift and substitution models feeding a joint promotion–supply optimiser with scenario robustness, and only if it beats the baseline on Simulated margin and service level and Uplift calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Supply availability forecast | Projected availability by week. Constraint. Guard against: supplier commitments. |
| Add Promo uplift estimate | Causal effect. Lever. Guard against: randomised tests. |
| Add Cross-item substitution | Demand transfer matrix. Side effects. Guard against: estimated. |
| Run it as one pipeline | Supply plan and forecasts (planning), Uplift and substitution models (causal ML), Joint optimiser (MILP), Scenario robustness check (simulation), Promotion execution (POS) and Outcome tracking (KPI), with Category manager review off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supply plan slips after promotion is locked | Contingency promo levers and early-warning triggers. |

**Deliberately not doing**

- Promo ID: none.
- Store manager: none.

**How the approach is proven**

Prove it offline on Simulated margin and service level and Uplift calibration using time-ordered splits, then online on "Stock-outs during promotions" with "Waste on promoted items" as the guardrail. Watch for: Promo uplift from non-randomised data and Static supply assumptions.

## Baseline and production design

- **Baseline (build this first):** Promotion calendar set by category managers.
- **Production design:** Causal uplift and substitution models feeding a joint promotion–supply optimiser with scenario robustness.

## Why AI, and why this kind

**Why AI.** Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste. The evidence that separates good from bad outcomes (Supply availability forecast, Promo uplift estimate, Cross-item substitution) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "independent promo and supply planning" are what teams reach for first, and they fail because promotions that ignore supply cause stock-outs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Causal uplift and substitution models feeding a joint promotion–supply optimiser with scenario robustness.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Supply availability forecast, Promo uplift estimate, Cross-item substitution and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Promotion calendar set by category managers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Causal uplift and substitution models feeding a joint promotion–supply optimiser with scenario robustness | chosen | Meets the run-window envelope at $0.360 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Stock-outs during promotions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Promo uplift from non-randomised data.
- Evaluation trap: Static supply assumptions.
- Supply plan slips after promotion is locked: promo drives stock-outs.
- Competitor reacts with price cuts: uplift collapses.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
