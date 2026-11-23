# Changeover Time Prediction: use-case brief

> Generated from the blueprint `manufacturing/changeover-time-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Changeover Time Prediction · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict the time a changeover will take between two products on a machine so schedules and sequences use realistic changeover times. The system has to run interactively, within a few seconds, inside these limits: Prediction within 3 s of a schedule query, Intervals reported and Results by product pair and machine.

**Why it is hard.** The obvious approach is time the machine was stopped, and it fails because start-up scrap counts as changeover time. The second trap is in "Pair": the real signal is product pair and machine specifics, while teams usually reach for one average per machine.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $4.3K a month. A mistake is expensive in the way changeover hours measures it.

**What success looks like.** Offline: Error against measured changeover, Interval coverage and Rank accuracy for the best next product. Online: Schedule adherence, Changeover hours and Late orders from changeover overruns. The launch is judged on "Schedule adherence" while "Changeover hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict the time a changeover will take between two products on a machine so schedules and sequences use realistic changeover times.

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

- Prediction within 3 s of a schedule query
- Intervals reported
- Results by product pair and machine
- 200K predictions per day

## The approach in one paragraph

Start with the standard changeover times from the routing, because planners use them today. Then earn the move to gradient boosting on product-pair and resource features with intervals, feeding the scheduler and flagging pairs that consistently overrun, and only if it beats the baseline on Error against measured changeover and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Product pair attributes | Differences in tooling, material and colour or size. Main driver. Guard against: from the product master. |
| Add Tool and fixture change needs | Whether the tooling must change. Large effect. Guard against: from routings. |
| Add Crew size and skill mix | Number and skill of changeover crew. Duration. Guard against: aggregated not individual. |
| Run it as one pipeline | Changeover history (MES), Pair feature build (product master joins), Duration model (gradient boosting), Interval estimate (quantile models), Scheduler feed (planning system), Overrun flags (analytics) and Retrain (monthly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new product pair | Use similar pairs and a wide interval. |

**Deliberately not doing**

- Operator name: not a driver.
- Order number: an identifier.
- Shift label alone: confounded.

**How the approach is proven**

Prove it offline on Error against measured changeover, Interval coverage and Rank accuracy for the best next product using time-ordered splits, then online on "Schedule adherence" with "Changeover hours" as the guardrail. Watch for: Using stop time as changeover time, One average per machine and Skipping intervals.

## Baseline and production design

- **Baseline (build this first):** The standard changeover times from the routing, because planners use them today.
- **Production design:** Gradient boosting on product-pair and resource features with intervals, feeding the scheduler and flagging pairs that consistently overrun.

## Why AI, and why this kind

**Why AI.** Predict the time a changeover will take between two products on a machine so schedules and sequences use realistic changeover times. The evidence that separates good from bad outcomes (Product pair attributes, Tool and fixture change needs, Crew size and skill mix) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "time the machine was stopped" are what teams reach for first, and they fail because start-up scrap counts as changeover time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on product-pair and resource features with intervals, feeding the scheduler and flagging pairs that consistently overrun.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Product pair attributes, Tool and fixture change needs, Crew size and skill mix and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The standard changeover times from the routing, because planners use them today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on product-pair and resource features with intervals, feeding the scheduler and flagging pairs that consistently overrun | chosen | Meets the 2500 ms envelope at $0.016 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Schedule adherence) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using stop time as changeover time.
- Evaluation trap: One average per machine.
- New product pair: the pair has never been run.
- Crew shortage: the duration rises.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
