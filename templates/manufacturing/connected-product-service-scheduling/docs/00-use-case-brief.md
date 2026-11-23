# Connected Product Service Scheduling: use-case brief

> Generated from the blueprint `manufacturing/connected-product-service-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Connected Product Service Scheduling · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits. The system has to run as a scheduled batch job, inside these limits: Customer contract and consent respected, Visits proposed with parts and skills and Customers can decline.

**Why it is hard.** The obvious approach is fixed intervals, and it fails because fixed intervals waste visits and miss early wear. The second trap is in "Bundle": the real signal is parts and skills planned with the visit, while teams usually reach for the visit only.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $2.2K a month. A mistake is expensive in the way visits per product-year measures it.

**What success looks like.** Offline: Prediction of service need against actual findings, Visit success without a second visit and Calibration. Online: Unplanned breakdowns, Visits per product-year and First-time fix rate. The launch is judged on "Unplanned breakdowns" while "Visits per product-year" must not get worse.

## Objective, loss and constraints

**Business objective.** Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits.

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

- Customer contract and consent respected
- Visits proposed with parts and skills
- Customers can decline
- Weekly plan for 400K installed products

## The approach in one paragraph

Start with fixed service intervals by hours or calendar, because it is the contract standard. Then earn the move to a condition-based service model that predicts time to service need, bundles parts and skills in a visit proposal and schedules with route optimisation within contract windows, and only if it beats the baseline on Prediction of service need against actual findings and Visit success without a second visit after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Usage hours and load | Running hours and load profile. Wear exposure. Guard against: from telemetry. |
| Add Condition indicators | Trends in key health measures. Need for service. Guard against: per product. |
| Add Service history | Last service and parts replaced. Reset. Guard against: from service records. |
| Run it as one pipeline | Telemetry and usage ingestion (IoT platform), Condition model (survival and degradation model), Visit proposal (rules), Parts and skills check (service system), Route and schedule (optimiser), Customer approval (portal) and Outcome tracking (service records). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle connectivity gaps | Use last known state and widen intervals. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Product serial: an identifier.
- Region name alone: weak link.

**How the approach is proven**

Prove it offline on Prediction of service need against actual findings, Visit success without a second visit and Calibration using time-ordered splits, then online on "Unplanned breakdowns" with "Visits per product-year" as the guardrail. Watch for: Fixed intervals only, Ignoring parts and No consent record.

## Baseline and production design

- **Baseline (build this first):** Fixed service intervals by hours or calendar, because it is the contract standard.
- **Production design:** A condition-based service model that predicts time to service need, bundles parts and skills in a visit proposal and schedules with route optimisation within contract windows.

## Why AI, and why this kind

**Why AI.** Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits. The evidence that separates good from bad outcomes (Usage hours and load, Condition indicators, Service history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed intervals" are what teams reach for first, and they fail because fixed intervals waste visits and miss early wear. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A condition-based service model that predicts time to service need, bundles parts and skills in a visit proposal and schedules with route optimisation within contract windows.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Usage hours and load, Condition indicators, Service history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed service intervals by hours or calendar, because it is the contract standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A condition-based service model that predicts time to service need, bundles parts and skills in a visit proposal and schedules with route optimisation within contract windows | chosen | Meets the run-window envelope at $0.012 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned breakdowns) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixed intervals only.
- Evaluation trap: Ignoring parts.
- Connectivity gaps: no data for a period.
- Customer declines: visits are postponed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
