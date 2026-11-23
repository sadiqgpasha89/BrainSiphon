# Ticket Resolution Time Prediction: use-case brief

> Generated from the blueprint `it-ops/ticket-resolution-time-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ticket Resolution Time Prediction · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict resolution time for new tickets so planners can balance queues, set realistic expectations and spot tickets at risk, without scoring individual agents. The system has to run interactively, within a few seconds, inside these limits: Estimates shown as ranges, Team-level queue views only and No individual agent ranking.

**Why it is hard.** The obvious approach is elapsed time, and it fails because waiting on customers distorts elapsed time. The second trap is in "Level": the real signal is queue and team planning, while teams usually reach for individual agent performance.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $3.6K a month. A mistake is expensive in the way planning accuracy measures it.

**What success looks like.** Offline: Calibration of ranges, Error by category and Rank stability. Online: Tickets breaching targets, Planning accuracy and Customer chasing. The launch is judged on "Tickets breaching targets" while "Planning accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict resolution time for new tickets so planners can balance queues, set realistic expectations and spot tickets at risk, without scoring individual agents.

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

- Estimates shown as ranges
- Team-level queue views only
- No individual agent ranking
- Prediction within 2 s
- 500K tickets per year

## The approach in one paragraph

Start with fixed targets by priority, because they are the standard service level design. Then earn the move to a quantile regression model with queue context that shows ranges, flags at-risk tickets and feeds capacity planning at queue level, and only if it beats the baseline on Calibration of ranges and Error by category after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Category and priority | Type and urgency. Core. Guard against: from the ticket. |
| Add Queue load | Open tickets in the target queue. Core. Guard against: from the ITSM. |
| Add Similar ticket durations | Durations of similar tickets. Core. Guard against: from history. |
| Run it as one pipeline | Feature build (batch), Duration model (gradient boosting), Range output (quantile regression), Planner view (dashboard) and Calibration check (monthly), with Ticket and queue data and Queue rebalancing off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle rare category | Wider ranges and category pooling. |

**Deliberately not doing**

- Agent name: personal data.
- Requester name: personal data.
- Ticket number: an identifier.

**How the approach is proven**

Prove it offline on Calibration of ranges, Error by category and Rank stability using time-ordered splits, then online on "Tickets breaching targets" with "Planning accuracy" as the guardrail. Watch for: Agent rankings, Elapsed time as the target and Estimates as commitments.

## Baseline and production design

- **Baseline (build this first):** Fixed targets by priority, because they are the standard service level design.
- **Production design:** A quantile regression model with queue context that shows ranges, flags at-risk tickets and feeds capacity planning at queue level.

## Why AI, and why this kind

**Why AI.** Predict resolution time for new tickets so planners can balance queues, set realistic expectations and spot tickets at risk, without scoring individual agents. The evidence that separates good from bad outcomes (Category and priority, Queue load, Similar ticket durations) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "elapsed time" are what teams reach for first, and they fail because waiting on customers distorts elapsed time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A quantile regression model with queue context that shows ranges, flags at-risk tickets and feeds capacity planning at queue level.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Category and priority, Queue load, Similar ticket durations and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed targets by priority, because they are the standard service level design | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A quantile regression model with queue context that shows ranges, flags at-risk tickets and feeds capacity planning at queue level | chosen | Meets the 2500 ms envelope at $0.081 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Tickets breaching targets) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Agent rankings.
- Evaluation trap: Elapsed time as the target.
- Rare category: few similar tickets exist.
- Holiday period: staffing changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
