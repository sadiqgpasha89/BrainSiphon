# Dynamic Rent Pricing for Multifamily: use-case brief

> Generated from the blueprint `real-estate/dynamic-rent-pricing-for-multifamily` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Rent Pricing for Multifamily · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules. The system has to run as a scheduled batch job, inside these limits: Rent-control and regulatory limits are hard constraints, No exchange or use of non-public competitor data and Daily price changes capped within a stated range.

**Why it is hard.** The obvious approach is the asking rent alone, and it fails because price is only one lever, and a quiet week may be from marketing and not from price. The second trap is in "Competition": the real signal is rents published on public listings, while teams usually reach for competitor data shared privately between operators.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.7K a month. A mistake is expensive in the way occupancy measures it.

**What success looks like.** Offline: Revenue lift in simulation and Demand forecast error. Online: Revenue per available unit and Occupancy. The launch is judged on "Revenue per available unit" while "Occupancy" must not get worse.

## Objective, loss and constraints

**Business objective.** Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\left(\text{rent}_t\,\text{occ}_t-\lambda\,\text{vacancy}_t\right)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor between 0 and 1: how much a reward one step later is worth compared with the same reward now. (one value per time step or token t) |
| \text{rent}_t | The asking rent set on day t. |
| \text{occ}_t | The share of units occupied on day t. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{vacancy}_t | Vacant unit-days on day t, which cost income. |

**Hard constraints**

- Rent-control and regulatory limits are hard constraints
- No exchange or use of non-public competitor data
- Daily price changes capped within a stated range
- Managers can see why each rent was recommended

## The approach in one paragraph

Start with manager-set rents reviewed weekly, because it is common. Then earn the move to demand forecasting plus a constrained pricing policy with exploration inside guardrails, and only if it beats the baseline on Revenue lift in simulation and Demand forecast error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Inquiry velocity | Enquiries per day for the unit type over 7 days divided by the 28-day mean. Shows rising or falling demand before leases signed. Guard against: noise from marketing campaigns, so adjust for ad spend. |
| Add Occupancy vs target | Current occupancy minus the target occupancy for the date. Tells the policy how hard to push price. Guard against: occupancy definitions differ between systems, so use one definition. |
| Add Competitor asking rents | Median public asking rent of comparable units within 1 km. Sets the position in the market. Guard against: asking prices differ from signed rents, so apply a historical discount. |
| Run it as one pipeline | Leasing data (property system), Competitor listings (public scrape), Demand model (boosting), Pricing policy (constrained optimiser), Guardrails (rules), Manager approval (app) and Outcome log (warehouse). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle rent control | Enforce the cap as a hard rule in the pricing policy. |

**Deliberately not doing**

- Unit nickname: A label with no bearing on demand.
- Photo count: Depends on the leasing team's habits and not on the unit.
- Agent: The leasing agent does not change what the market will pay.

**How the approach is proven**

Prove it offline on Revenue lift in simulation and Demand forecast error using time-ordered splits, then online on "Revenue per available unit" with "Occupancy" as the guardrail. Watch for: A simulated demand curve is optimistic about how tenants react to price and Past prices were not set at random, so the effect of price cannot be read from history.

## Baseline and production design

- **Baseline (build this first):** Manager-set rents reviewed weekly, because it is common.
- **Production design:** Demand forecasting plus a constrained pricing policy with exploration inside guardrails.

## Why AI, and why this kind

**Why AI.** Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules. The evidence that separates good from bad outcomes (Inquiry velocity, Occupancy vs target, Competitor asking rents) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the asking rent alone" are what teams reach for first, and they fail because price is only one lever, and a quiet week may be from marketing and not from price. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Demand forecasting plus a constrained pricing policy with exploration inside guardrails.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Inquiry velocity, Occupancy vs target, Competitor asking rents and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manager-set rents reviewed weekly, because it is common | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Demand forecasting plus a constrained pricing policy with exploration inside guardrails | chosen | Meets the run-window envelope at $0.064 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Revenue per available unit) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: A simulated demand curve is optimistic about how tenants react to price.
- Evaluation trap: Past prices were not set at random, so the effect of price cannot be read from history.
- Rent control: rent-control law caps rent and the price policy suggests more.
- New building: a new building is in lease-up with no demand history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
