# Capable-to-Promise Order Promising: use-case brief

> Generated from the blueprint `manufacturing/capable-to-promise-order-promising` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Capable-to-Promise Order Promising · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Give customers a reliable delivery date at order entry by checking material, capacity and logistics in real time so promised dates are met. The system has to run in under 100 milliseconds, inside these limits: Promise computed within 80 ms, Dates reflect live capacity and stock and Sales can reserve capacity within limits.

**Why it is hard.** The obvious approach is standard lead time, and it fails because a fixed lead time ignores the current load. The second trap is in "Risk": the real signal is a date with a confidence level, while teams usually reach for a single date.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $3.7K a month. A mistake is expensive in the way orders re-dated measures it.

**What success looks like.** Offline: On-time rate of promises, Calibration of confidence and Latency at p99. Online: Promise reliability, Orders re-dated and Expedite cost. The launch is judged on "Promise reliability" while "Orders re-dated" must not get worse.

## Objective, loss and constraints

**Business objective.** Give customers a reliable delivery date at order entry by checking material, capacity and logistics in real time so promised dates are met.

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

- Promise computed within 80 ms
- Dates reflect live capacity and stock
- Sales can reserve capacity within limits
- 40K quotes per hour at peak

## The approach in one paragraph

Start with the standard lead time by product family, because it is the fallback sales use today. Then earn the move to a promising service combining stock and capacity checks with a learned delay model and an allocation policy, returning a date with a confidence band, and only if it beats the baseline on On-time rate of promises and Calibration of confidence after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Available stock and planned receipts | Stock position by date. Material feasibility. Guard against: live. |
| Add Capacity load by week | Committed hours against capacity. Capacity feasibility. Guard against: from the schedule. |
| Add Historical on-time rate by lane | Delivery performance. Date risk. Guard against: by route. |
| Run it as one pipeline | Order request (quoting system), Stock and capacity check (planning services), Delay model (gradient boosting), Allocation policy (rules), Promise response (API), Reservation (planning) and Performance tracking (weekly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle capacity overbooked | Reservation locks and queueing. |

**Deliberately not doing**

- Sales rep name: irrelevant.
- Order channel alone: weak link.
- Quote number: an identifier.

**How the approach is proven**

Prove it offline on On-time rate of promises, Calibration of confidence and Latency at p99 using time-ordered splits, then online on "Promise reliability" with "Orders re-dated" as the guardrail. Watch for: Standard lead times, Single-point promise dates and No reservation locks.

## Baseline and production design

- **Baseline (build this first):** The standard lead time by product family, because it is the fallback sales use today.
- **Production design:** A promising service combining stock and capacity checks with a learned delay model and an allocation policy, returning a date with a confidence band.

## Why AI, and why this kind

**Why AI.** Give customers a reliable delivery date at order entry by checking material, capacity and logistics in real time so promised dates are met. The evidence that separates good from bad outcomes (Available stock and planned receipts, Capacity load by week, Historical on-time rate by lane) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "standard lead time" are what teams reach for first, and they fail because A fixed lead time ignores the current load. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A promising service combining stock and capacity checks with a learned delay model and an allocation policy, returning a date with a confidence band.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Available stock and planned receipts, Capacity load by week, Historical on-time rate by lane and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The standard lead time by product family, because it is the fallback sales use today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A promising service combining stock and capacity checks with a learned delay model and an allocation policy, returning a date with a confidence band | chosen | Meets the 80 ms envelope at $0.083 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Promise reliability) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Standard lead times.
- Evaluation trap: Single-point promise dates.
- Capacity overbooked: many requests at once.
- Plan change after the promise: the date becomes unreachable.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
