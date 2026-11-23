# Production Scheduling Optimisation: use-case brief

> Generated from the blueprint `manufacturing/production-scheduling-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Production Scheduling Optimisation · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Build and repair finite-capacity production schedules that respect machines, tooling, materials and due dates, so delivery performance rises and changeovers and idle time fall. The system has to run interactively, within a few seconds, inside these limits: Hard constraints on capacity, tooling and shift calendars, Planner can freeze and edit any order and Re-plan within 60 s after a disruption.

**Why it is hard.** The obvious approach is a nominal capacity table, and it fails because plans on paper fail on the floor. The second trap is in "Objective": the real signal is weighted lateness, changeover and inventory cost, while teams usually reach for utilisation.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $4.7K a month. A mistake is expensive in the way changeover hours measures it.

**What success looks like.** Offline: Schedule feasibility on replayed days, Duration prediction error and Lateness against the dispatch baseline. Online: On-time delivery, Changeover hours and Work in progress. The launch is judged on "On-time delivery" while "Changeover hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Build and repair finite-capacity production schedules that respect machines, tooling, materials and due dates, so delivery performance rises and changeovers and idle time fall.

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

- Hard constraints on capacity, tooling and shift calendars
- Planner can freeze and edit any order
- Re-plan within 60 s after a disruption
- Schedule explained by the binding constraint
- 50K operations per plan

## The approach in one paragraph

Start with dispatch rules such as earliest due date with a planner's manual changes, because they are the baseline most plants use. Then earn the move to a constraint-programming or local-search scheduler with learned durations and changeover costs, a rolling horizon with stability penalties and a simulator for what-if tests before release, and only if it beats the baseline on Schedule feasibility on replayed days and Duration prediction error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Predicted processing time | Duration model by product, machine and tool. Plan realism. Guard against: use confirmed durations. |
| Add Sequence-dependent changeover | Changeover minutes between product pairs. Shapes the sequence. Guard against: from the changeover matrix. |
| Add Material availability | Confirmed arrival dates of inputs. Feasibility. Guard against: from ERP. |
| Run it as one pipeline | Order and capacity intake (ERP and MES), Duration prediction (gradient boosting), Constraint model (scheduling solver), Plan stability filter (rules) and Release to MES (order release), with Planner review and freeze and Execution feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle machine breakdown | Event-driven repair that moves the fewest orders. |

**Deliberately not doing**

- Planner name: not a plan driver.
- Order entry channel: not a plan driver.
- Machine asset tag: an identifier.

**How the approach is proven**

Prove it offline on Schedule feasibility on replayed days, Duration prediction error and Lateness against the dispatch baseline using time-ordered splits, then online on "On-time delivery" with "Changeover hours" as the guardrail. Watch for: Planning on nominal capacity, Re-planning without stability and Optimising utilisation alone.

## Baseline and production design

- **Baseline (build this first):** Dispatch rules such as earliest due date with a planner's manual changes, because they are the baseline most plants use.
- **Production design:** A constraint-programming or local-search scheduler with learned durations and changeover costs, a rolling horizon with stability penalties and a simulator for what-if tests before release.

## Why AI, and why this kind

**Why AI.** Build and repair finite-capacity production schedules that respect machines, tooling, materials and due dates, so delivery performance rises and changeovers and idle time fall. The evidence that separates good from bad outcomes (Predicted processing time, Sequence-dependent changeover, Material availability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A nominal capacity table" are what teams reach for first, and they fail because plans on paper fail on the floor. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A constraint-programming or local-search scheduler with learned durations and changeover costs, a rolling horizon with stability penalties and a simulator for what-if tests before release.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Predicted processing time, Sequence-dependent changeover, Material availability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Dispatch rules such as earliest due date with a planner's manual changes, because they are the baseline most plants use | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A constraint-programming or local-search scheduler with learned durations and changeover costs, a rolling horizon with stability penalties and a simulator for what-if tests before release | chosen | Meets the 2500 ms envelope at $0.053 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (On-time delivery) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Planning on nominal capacity.
- Evaluation trap: Re-planning without stability.
- Machine breakdown: the schedule becomes infeasible mid-shift.
- Rush order: a priority order arrives late.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
