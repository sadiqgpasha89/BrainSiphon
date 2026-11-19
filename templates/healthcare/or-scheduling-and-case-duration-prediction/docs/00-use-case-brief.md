# OR Scheduling & Surgical Case Duration Prediction: use-case brief

> Generated from the blueprint `healthcare/or-scheduling-and-case-duration-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** OR Scheduling & Surgical Case Duration Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict surgical case durations and sequence operating-room blocks to cut overtime and idle time. The system has to run as a scheduled batch job, inside these limits: Surgeon preferences, Equipment availability and Emergency add-ons.

**Why it is hard.** The obvious approach is mean duration, and it fails because mean-based schedules overrun half the time. The second trap is in "Scheduling": the real signal is stochastic optimisation using duration uncertainty, while teams usually reach for deterministic slotting.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way oR utilisation measures it.

**What success looks like.** Offline: Pinball loss and Overtime minutes in simulation. Online: Overtime hours and OR utilisation. The launch is judged on "Overtime hours" while "OR utilisation" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict surgical case durations and sequence operating-room blocks to cut overtime and idle time.

**Training objective.** `\mathcal{L}=\sum_i\rho_{0.7}(y_i-\hat q_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_{0.7} | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \hat{q}_i | The model's predicted value at the chosen quantile. (one value per example i) |

**Hard constraints**

- Surgeon preferences
- Equipment availability
- Emergency add-ons
- Safety turnover times

## The approach in one paragraph

Start with surgeon-booked duration estimates. Then earn the move to quantile GBDT with surgeon random effects feeding a stochastic OR block scheduler, and only if it beats the baseline on Pinball loss and Overtime minutes in simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Surgeon-procedure history | Surgeon's median duration for procedure. Largest driver. Guard against: window before case date. |
| Add Patient complexity indicators | BMI, ASA class, comorbidity count. Duration modifiers. Guard against: pre-op data. |
| Add Team and room factors | Resident presence, room type. Efficiency. Guard against: rosters as-of. |
| Run it as one pipeline | Feature builder (Spark), Duration quantile model (LightGBM), Scheduler (stochastic MILP), Day-of-surgery adjuster (live updates) and Actual times (anaesthesia records), with Case booking data and OR manager review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new surgical technique | Procedure-family priors and early-update posterior. |

**Deliberately not doing**

- Case booking time of day: none.
- Surgeon seniority number: weak.

**How the approach is proven**

Prove it offline on Pinball loss and Overtime minutes in simulation using time-ordered splits, then online on "Overtime hours" with "OR utilisation" as the guardrail. Watch for: Using actual durations booked after the fact and Ignoring emergency cases in simulations.

## Baseline and production design

- **Baseline (build this first):** Surgeon-booked duration estimates.
- **Production design:** Quantile GBDT with surgeon random effects feeding a stochastic OR block scheduler.

## Why AI, and why this kind

**Why AI.** Predict surgical case durations and sequence operating-room blocks to cut overtime and idle time. The evidence that separates good from bad outcomes (Surgeon-procedure history, Patient complexity indicators, Team and room factors) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "mean duration" are what teams reach for first, and they fail because mean-based schedules overrun half the time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Quantile GBDT with surgeon random effects feeding a stochastic OR block scheduler.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Surgeon-procedure history, Patient complexity indicators, Team and room factors and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Surgeon-booked duration estimates | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile GBDT with surgeon random effects feeding a stochastic OR block scheduler | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overtime hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using actual durations booked after the fact.
- Evaluation trap: Ignoring emergency cases in simulations.
- New surgical technique: durations unknown.
- Emergency cases displace schedule: cascading overruns.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
