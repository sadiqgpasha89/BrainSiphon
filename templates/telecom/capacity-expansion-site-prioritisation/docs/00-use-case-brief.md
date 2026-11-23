# Capacity Expansion & Site Prioritisation: use-case brief

> Generated from the blueprint `telecom/capacity-expansion-site-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Capacity Expansion & Site Prioritisation · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose which sites and carriers to upgrade within a capital budget by predicted congestion, revenue and quality impact so spend goes where users benefit most. The system has to run as a scheduled batch job, inside these limits: Budget and vendor lead-time constraints respected, Ranking explains the demand and quality drivers per site and Planners can override with a reason.

**Why it is hard.** The obvious approach is last year's peak, and it fails because growth is uneven and events distort peaks. The second trap is in "Benefit": the real signal is estimated lift in user experience and retention from the upgrade, while teams usually reach for utilisation alone.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way capital per resolved congestion hour measures it.

**What success looks like.** Offline: Rank correlation with realised congestion, Benefit estimate error after upgrade and Optimiser gap to the best plan found offline. Online: Congested cell-hours after upgrade, Capital per resolved congestion hour and Upgrades with no measurable benefit. The launch is judged on "Congested cell-hours after upgrade" while "Capital per resolved congestion hour" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose which sites and carriers to upgrade within a capital budget by predicted congestion, revenue and quality impact so spend goes where users benefit most.

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

- Budget and vendor lead-time constraints respected
- Ranking explains the demand and quality drivers per site
- Planners can override with a reason
- Quarterly plan for 100K sites

## The approach in one paragraph

Start with rank sites by forecast utilisation above a threshold within budget, because planners recognise the method. Then earn the move to a constrained optimiser over predicted benefit per cost with scenario analysis, giving a ranked plan with reasons and sensitivity to demand growth, reviewed by planners, and only if it beats the baseline on Rank correlation with realised congestion and Benefit estimate error after upgrade after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Forecast busy-hour utilisation | Forecast p95 utilisation at 6 and 12 months. Congestion risk. Guard against: quantiles from the traffic forecast. |
| Add Users affected | Busy-hour users served by the cell. Scale of benefit. Guard against: exclude test devices. |
| Add Experience gap | Share of sessions below the quality target. Evidence of pain. Guard against: match the quality definition across vendors. |
| Run it as one pipeline | Demand forecast (time-series model), Benefit estimate (gradient boosting), Feasibility join (planning system), Portfolio optimiser (integer programming), Scenario analysis (batch simulation) and Outcome tracking (post-upgrade KPI check), with Planner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle demand forecast miss | Quarterly re-ranking and a watch list. |

**Deliberately not doing**

- Site name: an identifier.
- Last upgrade engineer: no link to need.
- Vendor brand alone: confounded.

**How the approach is proven**

Prove it offline on Rank correlation with realised congestion, Benefit estimate error after upgrade and Optimiser gap to the best plan found offline using time-ordered splits, then online on "Congested cell-hours after upgrade" with "Capital per resolved congestion hour" as the guardrail. Watch for: Ranking by utilisation alone, Ignoring feasibility and Not measuring the upgrade effect.

## Baseline and production design

- **Baseline (build this first):** Rank sites by forecast utilisation above a threshold within budget, because planners recognise the method.
- **Production design:** A constrained optimiser over predicted benefit per cost with scenario analysis, giving a ranked plan with reasons and sensitivity to demand growth, reviewed by planners.

## Why AI, and why this kind

**Why AI.** Choose which sites and carriers to upgrade within a capital budget by predicted congestion, revenue and quality impact so spend goes where users benefit most. The evidence that separates good from bad outcomes (Forecast busy-hour utilisation, Users affected, Experience gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "last year's peak" are what teams reach for first, and they fail because growth is uneven and events distort peaks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A constrained optimiser over predicted benefit per cost with scenario analysis, giving a ranked plan with reasons and sensitivity to demand growth, reviewed by planners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Forecast busy-hour utilisation, Users affected, Experience gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rank sites by forecast utilisation above a threshold within budget, because planners recognise the method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A constrained optimiser over predicted benefit per cost with scenario analysis, giving a ranked plan with reasons and sensitivity to demand growth, reviewed by planners | chosen | Meets the run-window envelope at $1.80 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Congested cell-hours after upgrade) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ranking by utilisation alone.
- Evaluation trap: Ignoring feasibility.
- Demand forecast miss: a site fills faster than expected.
- Vendor delay: the delivery plan slips by months.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
