# Safety Stock & Service-Level Optimisation: use-case brief

> Generated from the blueprint `supply-chain/safety-stock-and-service-level-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Safety Stock & Service-Level Optimisation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Allocate a working-capital budget to safety stock across SKUs to maximise overall service level. The system has to run as a scheduled batch job, inside these limits: Budget cap, Service differentiation and Intermittent demand.

**Why it is hard.** The obvious approach is same service level for all, and it fails because uniform service wastes capital on low-value items. The second trap is in "Distribution": the real signal is empirical or fitted non-normal demand-during-lead-time, while teams usually reach for normal approximation.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way inventory reduction measures it.

**What success looks like.** Offline: Service level at budget in simulation and Distribution fit quality. Online: Fill rate at equal inventory and Inventory reduction. The launch is judged on "Fill rate at equal inventory" while "Inventory reduction" must not get worse.

## Objective, loss and constraints

**Business objective.** Allocate a working-capital budget to safety stock across SKUs to maximise overall service level.

**Training objective.** `\max\;\sum_i w_i\,\mathrm{SL}_i(s_i)\ \text{s.t. }\sum_i c_i s_i\le B`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | The importance weight of item i. |
| \mathrm{SL}_i | Service level of item i as a function of its safety stock: the probability of not running out. |
| s_i | The safety stock held for item i, the thing being optimised. |
| c_i | The cost of holding one unit of item i. |
| B | The total inventory budget. |

**Hard constraints**

- Budget cap
- Service differentiation
- Intermittent demand
- Quarterly review

## The approach in one paragraph

Start with z-score safety stock at a uniform service level. Then earn the move to marginal analysis optimiser using simulated demand-during-lead-time distributions with differentiated targets, and only if it beats the baseline on Service level at budget in simulation and Distribution fit quality after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Demand over lead time distribution | Simulated convolution. Buffer size. Guard against: lead-time data. |
| Add Item value and criticality | Margin and criticality. Weighting. Guard against: master data. |
| Add Forecast bias | Mean error of forecasts. Adjustment. Guard against: matured. |
| Run it as one pipeline | Demand and lead-time history (lake), Distribution fitter (empirical bootstrap), Marginal optimiser (greedy allocation), Policy publisher (planning system) and Service tracker (KPI), with Planner review and Feedback to parameters off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle item with few demand observations | Hierarchical pooling and minimum-data rules. |

**Deliberately not doing**

- SKU description: none.
- Supplier: none.

**How the approach is proven**

Prove it offline on Service level at budget in simulation and Distribution fit quality using time-ordered splits, then online on "Fill rate at equal inventory" with "Inventory reduction" as the guardrail. Watch for: Normality assumed and Ignoring correlation between SKUs.

## Baseline and production design

- **Baseline (build this first):** Z-score safety stock at a uniform service level.
- **Production design:** Marginal analysis optimiser using simulated demand-during-lead-time distributions with differentiated targets.

## Why AI, and why this kind

**Why AI.** Allocate a working-capital budget to safety stock across SKUs to maximise overall service level. The evidence that separates good from bad outcomes (Demand over lead time distribution, Item value and criticality, Forecast bias) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "same service level for all" are what teams reach for first, and they fail because uniform service wastes capital on low-value items. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Marginal analysis optimiser using simulated demand-during-lead-time distributions with differentiated targets.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Demand over lead time distribution, Item value and criticality, Forecast bias and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Z-score safety stock at a uniform service level | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Marginal analysis optimiser using simulated demand-during-lead-time distributions with differentiated targets | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fill rate at equal inventory) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Normality assumed.
- Evaluation trap: Ignoring correlation between SKUs.
- Item with few demand observations: unstable distribution.
- Lead-time shock: buffers insufficient.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
