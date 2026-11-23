# Patrol Workload Allocation from Calls for Service: use-case brief

> Generated from the blueprint `public-safety/patrol-workload-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patrol Workload Allocation from Calls for Service · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Allocate patrol hours across areas and shifts to match calls-for-service workload and response time targets, using aggregated demand and never scoring individuals or places for crime propensity. The system has to run as a scheduled batch job, inside these limits: Workload from calls for service not from arrests, No individual or place-level crime prediction and Supervisors and community boards review plans.

**Why it is hard.** The obvious approach is arrest or stop counts, and it fails because enforcement data reflects where officers were sent. The second trap is in "Goal": the real signal is response time and community requests, while teams usually reach for predicted crime hot spots.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $12.7K a month. A mistake is expensive in the way beats below target measures it.

**What success looks like.** Offline: Workload forecast error, Response time target attainment and Equity metric by area. Online: Response times, Beats below target and Community complaints about presence. The launch is judged on "Response times" while "Beats below target" must not get worse.

## Objective, loss and constraints

**Business objective.** Allocate patrol hours across areas and shifts to match calls-for-service workload and response time targets, using aggregated demand and never scoring individuals or places for crime propensity.

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

- Workload from calls for service not from arrests
- No individual or place-level crime prediction
- Supervisors and community boards review plans
- Equity audit of presence and stops
- 150 beats

## The approach in one paragraph

Start with fixed beat staffing by shift, because it is the traditional allocation. Then earn the move to a workload forecast and allocation optimiser that sets patrol hours to meet response targets, with an equity review and a community-facing summary, and only if it beats the baseline on Workload forecast error and Response time target attainment after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Calls for service workload | Counts by beat and hour. Workload. Guard against: from CAD. |
| Add Call handling time | Time per call by type. Workload. Guard against: from CAD. |
| Add Response time gap to target | Gap to the target. Priority. Guard against: computed. |
| Run it as one pipeline | Calls and handling times (CAD), Workload forecast (time-series model), Allocation optimiser (solver), Equity checks (rules) and Roster update (scheduling), with Supervisor and board review and Outcome review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle reporting bias | Reporting rate checks. |

**Deliberately not doing**

- Officer name: irrelevant.
- Offender data: prohibited.
- Arrest counts: an enforcement artefact.

**How the approach is proven**

Prove it offline on Workload forecast error, Response time target attainment and Equity metric by area using time-ordered splits, then online on "Response times" with "Beats below target" as the guardrail. Watch for: Crime prediction, Arrest counts as demand and No community review.

## Baseline and production design

- **Baseline (build this first):** Fixed beat staffing by shift, because it is the traditional allocation.
- **Production design:** A workload forecast and allocation optimiser that sets patrol hours to meet response targets, with an equity review and a community-facing summary.

## Why AI, and why this kind

**Why AI.** Allocate patrol hours across areas and shifts to match calls-for-service workload and response time targets, using aggregated demand and never scoring individuals or places for crime propensity. The evidence that separates good from bad outcomes (Calls for service workload, Call handling time, Response time gap to target) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "arrest or stop counts" are what teams reach for first, and they fail because enforcement data reflects where officers were sent. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A workload forecast and allocation optimiser that sets patrol hours to meet response targets, with an equity review and a community-facing summary.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Calls for service workload, Call handling time, Response time gap to target and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed beat staffing by shift, because it is the traditional allocation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A workload forecast and allocation optimiser that sets patrol hours to meet response targets, with an equity review and a community-facing summary | chosen | Meets the run-window envelope at $0.0015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Response times) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Crime prediction.
- Evaluation trap: Arrest counts as demand.
- Reporting bias: some areas report less.
- Event surge: demand rises on weekends.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
