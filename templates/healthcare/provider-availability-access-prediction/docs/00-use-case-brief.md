# Provider Availability & Access Prediction: use-case brief

> Generated from the blueprint `healthcare/provider-availability-access-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Availability & Access Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate appointment wait times and access by specialty, location, provider and payer network, separating observed open slots from inferred estimates, so operations can validate availability before it is shown to members or patients. The system has to run as a scheduled batch job, inside these limits: Operations validates availability before it is communicated to members or patients, Observed slots and inferred estimates are always labelled separately and Forecasts state intervals and data freshness.

**Why it is hard.** The obvious approach is one blended figure, and it fails because members must not be told an estimate is a fact. The second trap is in "Queue": the real signal is demand and capacity queue model, while teams usually reach for average wait.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way wait-time forecast accuracy measures it.

**What success looks like.** Offline: Weighted quantile loss and interval coverage, Wait-time error against mystery-shopper calls and Capacity-risk precision at the review capacity. Online: Share of availability statements validated, Wait-time forecast accuracy and Members given a wrong wait estimate. The launch is judged on "Share of availability statements validated" while "Wait-time forecast accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate appointment wait times and access by specialty, location, provider and payer network, separating observed open slots from inferred estimates, so operations can validate availability before it is shown to members or patients.

**Training objective.** `\mathcal{L}=\sum_{t}\left[\tau\,(y_t-\hat y_t)_+ +(1-\tau)\,(\hat y_t-y_t)_+\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \tau | Temperature: scales similarity scores before the softmax; a smaller value makes the model sharper and more confident. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Operations validates availability before it is communicated to members or patients
- Observed slots and inferred estimates are always labelled separately
- Forecasts state intervals and data freshness
- The tool does not book or hold appointments
- Forecasts 60K provider-specialty series nightly
- Provider-level estimates are used for operations and not for ranking providers publicly

## The approach in one paragraph

Start with a mystery-shopper call survey samples wait times a few times a year. Then earn the move to a probabilistic wait-time forecaster that combines queueing analytics with a gradient-boosted time-series model over slots, demand, cancellations and capacity, with observed-versus-inferred labelling and a freshness report, and only if it beats the baseline on Weighted quantile loss and interval coverage and Wait-time error against mystery-shopper calls after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Open slots and booking horizon | Observed open appointments and how far ahead they are. Direct availability. Guard against: schedule snapshot. |
| Add Demand and referral inflow | Appointments requested and referrals received. Queue arrival rate. Guard against: event stream. |
| Add Cancellation and no-show rate | Share of booked slots released or unused. Effective capacity. Guard against: earlier periods. |
| Run it as one pipeline | Scheduling and demand intake (scheduling extracts), Capacity and slot features (point-in-time features), Wait-time forecaster (gradient boosting with quantiles), Observed-versus-inferred labeller (rules), Operations validation (human) and Forecast and outcome log (lakehouse), with Queue model off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle provider with no online schedule | Inferred estimate with a clear label. |

**Deliberately not doing**

- Provider name: label.
- Directory sort order: artefact.
- Marketing text: not capacity.

**How the approach is proven**

Prove it offline on Weighted quantile loss and interval coverage, Wait-time error against mystery-shopper calls and Capacity-risk precision at the review capacity using time-ordered splits, then online on "Share of availability statements validated" with "Wait-time forecast accuracy" as the guardrail. Watch for: Presenting inferred waits as facts, Using average wait only and Ignoring cancellations.

## Baseline and production design

- **Baseline (build this first):** A mystery-shopper call survey samples wait times a few times a year.
- **Production design:** A probabilistic wait-time forecaster that combines queueing analytics with a gradient-boosted time-series model over slots, demand, cancellations and capacity, with observed-versus-inferred labelling and a freshness report.

## Why AI, and why this kind

**Why AI.** Estimate appointment wait times and access by specialty, location, provider and payer network, separating observed open slots from inferred estimates, so operations can validate availability before it is shown to members or patients. The evidence that separates good from bad outcomes (Open slots and booking horizon, Demand and referral inflow, Cancellation and no-show rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one blended figure" are what teams reach for first, and they fail because members must not be told an estimate is a fact. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A probabilistic wait-time forecaster that combines queueing analytics with a gradient-boosted time-series model over slots, demand, cancellations and capacity, with observed-versus-inferred labelling and a freshness report.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Open slots and booking horizon, Demand and referral inflow, Cancellation and no-show rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A mystery-shopper call survey samples wait times a few times a year | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A probabilistic wait-time forecaster that combines queueing analytics with a gradient-boosted time-series model over slots, demand, cancellations and capacity, with observed-versus-inferred labelling and a freshness report | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Share of availability statements validated) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Presenting inferred waits as facts.
- Evaluation trap: Using average wait only.
- Provider with no online schedule: no observed slots.
- Template change: slots appear or vanish.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
