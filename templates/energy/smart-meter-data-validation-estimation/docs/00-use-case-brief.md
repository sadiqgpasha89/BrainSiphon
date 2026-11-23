# Smart Meter Data Validation and Estimation: use-case brief

> Generated from the blueprint `energy/smart-meter-data-validation-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Smart Meter Data Validation and Estimation · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Validate interval meter reads, detect gaps and spikes, and estimate missing values with flags so billing and analytics use trustworthy data. The system has to run as a scheduled batch job, inside these limits: Every estimate is flagged and traceable, Estimates follow the regulatory rules and Validation within one day of read.

**Why it is hard.** The obvious approach is overwritten values, and it fails because disputes need the original reads. The second trap is in "Estimate": the real signal is a method by gap length and type, while teams usually reach for one method for all gaps.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $5.3K a month. A mistake is expensive in the way billing disputes measures it.

**What success looks like.** Offline: Estimation error on masked values, Flag precision and Share of valid reads. Online: Estimated bill share, Billing disputes and Manual validation effort. The launch is judged on "Estimated bill share" while "Billing disputes" must not get worse.

## Objective, loss and constraints

**Business objective.** Validate interval meter reads, detect gaps and spikes, and estimate missing values with flags so billing and analytics use trustworthy data.

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

- Every estimate is flagged and traceable
- Estimates follow the regulatory rules
- Validation within one day of read
- Never overwrites raw reads
- 10M meters

## The approach in one paragraph

Start with linear interpolation for short gaps and profile-based estimates for long gaps, because they are standard rules. Then earn the move to a rule and model hybrid that applies regulatory validation rules, estimates by gap type using cohort profiles and attaches flags and method codes to each value, and only if it beats the baseline on Estimation error on masked values and Flag precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Gap length and pattern | Missing intervals and their length. Method choice. Guard against: from the reads. |
| Add Neighbour and cohort load shape | Load of similar meters. Estimate basis. Guard against: aggregated. |
| Add Spike and zero checks | Extreme values and long zeros. Quality flags. Guard against: rules and model. |
| Run it as one pipeline | Read intake (head-end system), Rule validation (validation engine), Gap classification (rules), Estimation (cohort model) and Flagging and storage (MDM), with Exception queue and Quality reporting off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle daylight saving shift | Time handling tests and flags. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Meter serial: an identifier.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Estimation error on masked values, Flag precision and Share of valid reads using time-ordered splits, then online on "Estimated bill share" with "Billing disputes" as the guardrail. Watch for: Overwriting raw reads, One method for all gaps and Ignoring real outages.

## Baseline and production design

- **Baseline (build this first):** Linear interpolation for short gaps and profile-based estimates for long gaps, because they are standard rules.
- **Production design:** A rule and model hybrid that applies regulatory validation rules, estimates by gap type using cohort profiles and attaches flags and method codes to each value.

## Why AI, and why this kind

**Why AI.** Validate interval meter reads, detect gaps and spikes, and estimate missing values with flags so billing and analytics use trustworthy data. The evidence that separates good from bad outcomes (Gap length and pattern, Neighbour and cohort load shape, Spike and zero checks) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "overwritten values" are what teams reach for first, and they fail because disputes need the original reads. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A rule and model hybrid that applies regulatory validation rules, estimates by gap type using cohort profiles and attaches flags and method codes to each value.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Gap length and pattern, Neighbour and cohort load shape, Spike and zero checks and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Linear interpolation for short gaps and profile-based estimates for long gaps, because they are standard rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rule and model hybrid that applies regulatory validation rules, estimates by gap type using cohort profiles and attaches flags and method codes to each value | chosen | Meets the run-window envelope at $0.00062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Estimated bill share) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Overwriting raw reads.
- Evaluation trap: One method for all gaps.
- Daylight saving shift: intervals duplicate or vanish.
- Meter swap: the register resets.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
