# OEE Loss Attribution: use-case brief

> Generated from the blueprint `manufacturing/oee-loss-attribution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** OEE Loss Attribution · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Attribute lost production time and output to causes such as stops, speed loss and quality so improvement effort targets the largest loss buckets. The system has to run as a scheduled batch job, inside these limits: Loss definitions follow the plant standard, Attribution reconciles to total lost hours and Per-line and per-shift views.

**Why it is hard.** The obvious approach is local definitions, and it fails because you cannot compare lines with different rules. The second trap is in "Coverage": the real signal is short stops captured automatically, while teams usually reach for operator-logged stops only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way time spent producing the report measures it.

**What success looks like.** Offline: Reconciliation of lost time, Classification accuracy against audits and Unexplained loss share. Online: OEE improvement on targeted lines, Time spent producing the report and Loss closed per quarter. The launch is judged on "OEE improvement on targeted lines" while "Time spent producing the report" must not get worse.

## Objective, loss and constraints

**Business objective.** Attribute lost production time and output to causes such as stops, speed loss and quality so improvement effort targets the largest loss buckets.

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

- Loss definitions follow the plant standard
- Attribution reconciles to total lost hours
- Per-line and per-shift views
- 2K lines in the daily run

## The approach in one paragraph

Start with a manual OEE calculation from operator logs and counts, because it is the standard practice. Then earn the move to automated state classification from machine signals with a hierarchical loss tree, anomaly flags for unexplained loss and a weekly Pareto with cost, and only if it beats the baseline on Reconciliation of lost time and Classification accuracy against audits after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Stop duration and frequency | Number and length of stops by cause. Availability loss. Guard against: from machine states. |
| Add Speed versus ideal | Achieved rate against the ideal rate. Performance loss. Guard against: ideal rate from engineering. |
| Add Reject count by cause | Rejects by quality class. Quality loss. Guard against: from inspection. |
| Run it as one pipeline | Machine state capture (PLC and historian), Stop classification (rules and model), Loss tree (batch aggregation), Unexplained loss flag (anomaly model), Pareto and cost (BI dashboard), Action tracking (improvement system) and Quality join (MES). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle micro-stops | Capture automatically with a minimum threshold. |

**Deliberately not doing**

- Operator name: not a cause.
- Shift label alone: confounded.
- Machine age: weak link.

**How the approach is proven**

Prove it offline on Reconciliation of lost time, Classification accuracy against audits and Unexplained loss share using time-ordered splits, then online on "OEE improvement on targeted lines" with "Time spent producing the report" as the guardrail. Watch for: Operator-logged stops only, Local definitions and Reporting a percentage without a Pareto.

## Baseline and production design

- **Baseline (build this first):** A manual OEE calculation from operator logs and counts, because it is the standard practice.
- **Production design:** Automated state classification from machine signals with a hierarchical loss tree, anomaly flags for unexplained loss and a weekly Pareto with cost.

## Why AI, and why this kind

**Why AI.** Attribute lost production time and output to causes such as stops, speed loss and quality so improvement effort targets the largest loss buckets. The evidence that separates good from bad outcomes (Stop duration and frequency, Speed versus ideal, Reject count by cause) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "local definitions" are what teams reach for first, and they fail because you cannot compare lines with different rules. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Automated state classification from machine signals with a hierarchical loss tree, anomaly flags for unexplained loss and a weekly Pareto with cost.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Stop duration and frequency, Speed versus ideal, Reject count by cause and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A manual OEE calculation from operator logs and counts, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Automated state classification from machine signals with a hierarchical loss tree, anomaly flags for unexplained loss and a weekly Pareto with cost | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (OEE improvement on targeted lines) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Operator-logged stops only.
- Evaluation trap: Local definitions.
- Micro-stops: many stops under 30 seconds.
- Product mix change: the ideal rate varies.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
