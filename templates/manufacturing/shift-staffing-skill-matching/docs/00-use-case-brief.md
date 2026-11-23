# Shift Staffing & Skill Matching: use-case brief

> Generated from the blueprint `manufacturing/shift-staffing-skill-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shift Staffing & Skill Matching · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast labour demand by line and skill and propose shift rosters that meet the plan within contract and labour rules, using aggregated data and no individual performance scoring. The system has to run as a scheduled batch job, inside these limits: Rosters follow contracts, breaks and works-council rules, No individual productivity scoring and Supervisors can override.

**Why it is hard.** The obvious approach is last month's headcount, and it fails because plans change with orders. The second trap is in "Skills": the real signal is certified skills matched to station needs, while teams usually reach for headcount only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way understaffed shifts measures it.

**What success looks like.** Offline: Roster feasibility, Forecast error in hours and Skill coverage attainment. Online: Overtime hours, Understaffed shifts and Skill gaps closed. The launch is judged on "Overtime hours" while "Understaffed shifts" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast labour demand by line and skill and propose shift rosters that meet the plan within contract and labour rules, using aggregated data and no individual performance scoring.

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

- Rosters follow contracts, breaks and works-council rules
- No individual productivity scoring
- Supervisors can override
- Weekly plan for 20K employees

## The approach in one paragraph

Start with a fixed roster by shift pattern with manual swaps, because it is the common approach. Then earn the move to a forecast of labour hours with a roster optimiser that respects skills and labour rules, producing a draft for supervisors and a skill-gap report for training plans, and only if it beats the baseline on Roster feasibility and Forecast error in hours after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Planned production hours by line | Hours from the schedule. Demand. Guard against: from planning. |
| Add Skill coverage per station | Certified staff per station and shift. Constraint. Guard against: from training records. |
| Add Absence rate by group | Aggregated absence rate by team and season. Planning buffer. Guard against: aggregated only. |
| Run it as one pipeline | Production plan intake (planning system), Labour demand forecast (time-series model), Skill and rule model (roster constraints), Roster optimiser (constraint solver) and Outcome tracking (weekly), with Supervisor review and Skill gap report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sudden absences | Re-roster with minimal change and a cover list. |

**Deliberately not doing**

- Employee name: irrelevant and private.
- Age alone: irrelevant and risky.
- Badge swipe time: a monitoring artefact.

**How the approach is proven**

Prove it offline on Roster feasibility, Forecast error in hours and Skill coverage attainment using time-ordered splits, then online on "Overtime hours" with "Understaffed shifts" as the guardrail. Watch for: Individual monitoring, Headcount-only plans and Ignoring labour rules.

## Baseline and production design

- **Baseline (build this first):** A fixed roster by shift pattern with manual swaps, because it is the common approach.
- **Production design:** A forecast of labour hours with a roster optimiser that respects skills and labour rules, producing a draft for supervisors and a skill-gap report for training plans.

## Why AI, and why this kind

**Why AI.** Forecast labour demand by line and skill and propose shift rosters that meet the plan within contract and labour rules, using aggregated data and no individual performance scoring. The evidence that separates good from bad outcomes (Planned production hours by line, Skill coverage per station, Absence rate by group) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "last month's headcount" are what teams reach for first, and they fail because plans change with orders. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A forecast of labour hours with a roster optimiser that respects skills and labour rules, producing a draft for supervisors and a skill-gap report for training plans.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Planned production hours by line, Skill coverage per station, Absence rate by group and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A fixed roster by shift pattern with manual swaps, because it is the common approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A forecast of labour hours with a roster optimiser that respects skills and labour rules, producing a draft for supervisors and a skill-gap report for training plans | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overtime hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual monitoring.
- Evaluation trap: Headcount-only plans.
- Sudden absences: the roster has holes.
- New line start-up: skills are scarce.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
