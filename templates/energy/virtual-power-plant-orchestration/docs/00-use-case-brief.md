# Virtual Power Plant Orchestration: use-case brief

> Generated from the blueprint `energy/virtual-power-plant-orchestration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Virtual Power Plant Orchestration · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Coordinate distributed batteries, solar, flexible loads and chargers as one resource that bids into markets and follows grid signals, within each owner's limits and consent. The system has to run interactively, within a few seconds, inside these limits: Each asset's owner limits and consent respected, Safety limits in local controllers and Delivery verified against metered data.

**Why it is hard.** The obvious approach is maximum extraction, and it fails because trust and consent are required for a fleet. The second trap is in "Delivery": the real signal is verified delivery against metered response, while teams usually reach for planned dispatch.

**Scale and stakes.** At 10 million users this is about 36.0M model-touching events a day, 417 requests per second on average and 2.5K at peak, at an estimated $6.3K a month. A mistake is expensive in the way penalties measures it.

**What success looks like.** Offline: Delivery against bid, Availability forecast error and Limit breach rate. Online: Delivered flexibility, Penalties and Owner opt-outs. The launch is judged on "Delivered flexibility" while "Penalties" must not get worse.

## Objective, loss and constraints

**Business objective.** Coordinate distributed batteries, solar, flexible loads and chargers as one resource that bids into markets and follows grid signals, within each owner's limits and consent.

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

- Each asset's owner limits and consent respected
- Safety limits in local controllers
- Delivery verified against metered data
- Dispatch signals every 5 minutes
- 200K assets

## The approach in one paragraph

Start with static schedules for each asset type with fixed windows, because it is the simple programme. Then earn the move to a hierarchical controller with fleet-level bids from availability forecasts and device-level dispatch within owner limits, with verification, penalty-aware bidding and local safety control, and only if it beats the baseline on Delivery against bid and Availability forecast error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Fleet availability forecast | Forecast of controllable capacity. Bid size. Guard against: from asset models. |
| Add Asset response model | Past response to signals. Delivery risk. Guard against: from metering. |
| Add Market and grid signals | Price and grid service calls. Value. Guard against: from markets. |
| Run it as one pipeline | Asset state and consent (device platforms), Availability forecast (time-series model), Fleet bid (optimiser), Dispatch signals (orchestrator), Local control (device controllers), Delivery verification (metering) and Settlement and learning (daily). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle link loss | Local fallback behaviour. |

**Deliberately not doing**

- Owner name: irrelevant and private.
- Device brand alone: weak link.
- Installer name: irrelevant.

**How the approach is proven**

Prove it offline on Delivery against bid, Availability forecast error and Limit breach rate using time-ordered splits, then online on "Delivered flexibility" with "Penalties" as the guardrail. Watch for: Central control without local safety, Planned dispatch as delivery and Ignoring consent.

## Baseline and production design

- **Baseline (build this first):** Static schedules for each asset type with fixed windows, because it is the simple programme.
- **Production design:** A hierarchical controller with fleet-level bids from availability forecasts and device-level dispatch within owner limits, with verification, penalty-aware bidding and local safety control.

## Why AI, and why this kind

**Why AI.** Coordinate distributed batteries, solar, flexible loads and chargers as one resource that bids into markets and follows grid signals, within each owner's limits and consent. The evidence that separates good from bad outcomes (Fleet availability forecast, Asset response model, Market and grid signals) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "maximum extraction" are what teams reach for first, and they fail because trust and consent are required for a fleet. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A hierarchical controller with fleet-level bids from availability forecasts and device-level dispatch within owner limits, with verification, penalty-aware bidding and local safety control.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Fleet availability forecast, Asset response model, Market and grid signals and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static schedules for each asset type with fixed windows, because it is the simple programme | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical controller with fleet-level bids from availability forecasts and device-level dispatch within owner limits, with verification, penalty-aware bidding and local safety control | chosen | Meets the 2500 ms envelope at $0.0059 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Delivered flexibility) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Central control without local safety.
- Evaluation trap: Planned dispatch as delivery.
- Link loss: devices lose connection.
- Under-delivery: the fleet misses the call.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
