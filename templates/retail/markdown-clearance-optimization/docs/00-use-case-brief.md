# Markdown & Clearance Optimisation: use-case brief

> Generated from the blueprint `retail/markdown-clearance-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Markdown & Clearance Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose markdown depth and timing to sell through end-of-season stock at maximum recovery before a cut-off date. The system has to run as a scheduled batch job, inside these limits: Terminal inventory target, Markdown cadence rules and Store-level execution.

**Why it is hard.** The obvious approach is constant elasticity, and it fails because elasticity increases near end-of-season. The second trap is in "Cannibalisation": the real signal is cross-item cannibalisation within a style family, while teams usually reach for item-level independent models.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way terminal stock units measures it.

**What success looks like.** Offline: Revenue recovery vs baseline in backtest and Sell-through forecast MAPE. Online: Recovery rate and Terminal stock units. The launch is judged on "Recovery rate" while "Terminal stock units" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose markdown depth and timing to sell through end-of-season stock at maximum recovery before a cut-off date.

**Training objective.** `\max_{m_{1:T}}\;\mathbb{E}\!\left[\sum_t (p_0(1-m_t)-c)\,q_t(m_t)\right]\ \text{s.t. }\sum_t q_t\ge S`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{m_{1:T}} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| p_0 | The original price: p_0 is the price before markdowns. |
| m_t | The markdown (discount fraction) applied at time t. |
| c | The unit cost of the item. |
| q_t | Expected units sold at time t given markdown m_t. |
| S | The number of units that must be sold by the end of the clearance period. |

**Hard constraints**

- Terminal inventory target
- Markdown cadence rules
- Store-level execution
- Brand price floors

## The approach in one paragraph

Start with fixed markdown cadence (25-50-70). Then earn the move to dynamic-programming markdown optimiser over a Bayesian sell-through model with category-level elasticity and cannibalisation terms, and only if it beats the baseline on Revenue recovery vs baseline in backtest and Sell-through forecast MAPE after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Sell-through rate to date | Units sold over initial units. Progress vs target. Guard against: as-of snapshot. |
| Add Weeks to season end | Calendar remaining. Urgency. Guard against: season-specific calendars. |
| Add Elasticity by markdown depth | Response curve per category. Optimisation input. Guard against: fitted on prior seasons only. |
| Run it as one pipeline | Inventory and sales snapshot (lakehouse), Sell-through model (Bayesian regression), Markdown optimiser (dynamic programming), Constraint checker (brand floors), Price update feed (POS and web), Merchandiser approval (workflow) and Outcome tracker (recovery rate). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supply chain delay shifts arrivals | Arrival-date aware model and delay buffers. |

**Deliberately not doing**

- Item colour popularity last year: already in baseline demand.
- Store manager ID: unrelated.

**How the approach is proven**

Prove it offline on Revenue recovery vs baseline in backtest and Sell-through forecast MAPE using time-ordered splits, then online on "Recovery rate" with "Terminal stock units" as the guardrail. Watch for: Backtests using realised future stock and Ignoring cannibalisation in simulation.

## Baseline and production design

- **Baseline (build this first):** Fixed markdown cadence (25-50-70).
- **Production design:** Dynamic-programming markdown optimiser over a Bayesian sell-through model with category-level elasticity and cannibalisation terms.

## Why AI, and why this kind

**Why AI.** Choose markdown depth and timing to sell through end-of-season stock at maximum recovery before a cut-off date. The evidence that separates good from bad outcomes (Sell-through rate to date, Weeks to season end, Elasticity by markdown depth) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "constant elasticity" are what teams reach for first, and they fail because elasticity increases near end-of-season. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Dynamic-programming markdown optimiser over a Bayesian sell-through model with category-level elasticity and cannibalisation terms.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Sell-through rate to date, Weeks to season end, Elasticity by markdown depth and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed markdown cadence (25-50-70) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Dynamic-programming markdown optimiser over a Bayesian sell-through model with category-level elasticity and cannibalisation terms | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recovery rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Backtests using realised future stock.
- Evaluation trap: Ignoring cannibalisation in simulation.
- Supply chain delay shifts arrivals: late stock marked down early.
- Weather anomaly (warm winter): season demand collapses.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
