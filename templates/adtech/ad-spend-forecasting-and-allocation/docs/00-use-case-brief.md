# Ad Spend Forecasting & Budget Allocation: use-case brief

> Generated from the blueprint `adtech/ad-spend-forecasting-and-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Spend Forecasting & Budget Allocation · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast spend and outcomes by campaign and allocate budgets across campaigns to maximise return under constraints. The system has to run as a scheduled batch job, inside these limits: Minimum commitments, Response curves and Daily rebalance.

**Why it is hard.** The obvious approach is proportional allocation, and it fails because equal marginal returns is the optimum. The second trap is in "Uncertainty": the real signal is allocate with uncertainty (Thompson sampling), while teams usually reach for plug-in estimates.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way budget utilisation measures it.

**What success looks like.** Offline: Backtest allocation value and Curve fit error. Online: Total conversions at equal budget and Budget utilisation. The launch is judged on "Total conversions at equal budget" while "Budget utilisation" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast spend and outcomes by campaign and allocate budgets across campaigns to maximise return under constraints.

**Training objective.** `\max_{b}\;\sum_c R_c(b_c)\ \text{s.t. }\sum_c b_c\le B`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{b} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_c | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| R_c | The response curve of channel c: expected return as a function of spend. |
| b_c | The budget given to channel c. |
| B | The total budget to split across channels. |

**Hard constraints**

- Minimum commitments
- Response curves
- Daily rebalance
- Explainability

## The approach in one paragraph

Start with allocate proportionally to last period spend. Then earn the move to bayesian response curves per campaign with Thompson sampling allocation and guardrails for minimum commitments, and only if it beats the baseline on Backtest allocation value and Curve fit error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Marginal ROI | Derivative of response curve. Allocation. Guard against: estimation. |
| Add Saturation level | Spend at which returns flatten. Cap. Guard against: curves. |
| Add Pacing state | Spend vs plan. Feasibility. Guard against: real-time. |
| Run it as one pipeline | Performance data (warehouse), Response-curve model (Bayesian), Allocator (concave optimisation), Guardrails (constraints), Budget API (platforms) and Realised return (tracking), with Marketer review off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sparse data for new campaigns | Hierarchical priors from similar campaigns. |

**Deliberately not doing**

- Campaign ID: none.
- Owner: none.

**How the approach is proven**

Prove it offline on Backtest allocation value and Curve fit error using time-ordered splits, then online on "Total conversions at equal budget" with "Budget utilisation" as the guardrail. Watch for: Observational curves confounded by bidding changes and Ignoring carryover.

## Baseline and production design

- **Baseline (build this first):** Allocate proportionally to last period spend.
- **Production design:** Bayesian response curves per campaign with Thompson sampling allocation and guardrails for minimum commitments.

## Why AI, and why this kind

**Why AI.** Forecast spend and outcomes by campaign and allocate budgets across campaigns to maximise return under constraints. The evidence that separates good from bad outcomes (Marginal ROI, Saturation level, Pacing state) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "proportional allocation" are what teams reach for first, and they fail because equal marginal returns is the optimum. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Bayesian response curves per campaign with Thompson sampling allocation and guardrails for minimum commitments.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Marginal ROI, Saturation level, Pacing state and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Allocate proportionally to last period spend | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian response curves per campaign with Thompson sampling allocation and guardrails for minimum commitments | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Total conversions at equal budget) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Observational curves confounded by bidding changes.
- Evaluation trap: Ignoring carryover.
- Sparse data for new campaigns: new campaigns have little data so fitted response curves are wild and misallocate budget.
- Platform changes delivery logic: the ad platform changes its delivery algorithm so the fitted response curves become invalid.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
