# Loss Reserving with Machine Learning: use-case brief

> Generated from the blueprint `bfsi/loss-reserving-with-machine-learning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Loss Reserving with Machine Learning · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate ultimate claim costs and their uncertainty by line and accident period to set reserves. The system has to run as a scheduled batch job, inside these limits: Reconcile with actuarial chain-ladder, Uncertainty intervals required and Quarterly sign-off.

**Why it is hard.** The obvious approach is calendar-year totals, and it fails because changes in payment patterns hide in totals. The second trap is in "Case reserves": the real signal is adjuster reserve adequacy over time, while teams usually reach for taking reserves as truth.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way release or strengthening measures it.

**What success looks like.** Offline: Reserve error against ultimate and Interval coverage. Online: Reserve volatility and Release or strengthening. The launch is judged on "Reserve volatility" while "Release or strengthening" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate ultimate claim costs and their uncertainty by line and accident period to set reserves.

**Training objective.** `\mathcal{L}=\mathrm{Poisson}(\hat{y},y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.75},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Poisson} | Poisson likelihood: a probability model for counts of events. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.75} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Reconcile with actuarial chain-ladder
- Uncertainty intervals required
- Quarterly sign-off
- Reproducible

## The approach in one paragraph

Start with chain-ladder with actuarial adjustments, because it is the industry standard. Then earn the move to claim-level and triangle-level models blended with chain-ladder, bootstrap or quantile intervals and a drivers report, and only if it beats the baseline on Reserve error against ultimate and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Development factors | Incremental payments ratio. Pattern. Guard against: volatile at long tails. |
| Add Open claim count and severity | Counts and average. Exposure. Guard against: reopened claims. |
| Add Case reserve strength | Paid divided by incurred. Adequacy. Guard against: practice shifts. |
| Run it as one pipeline | Claims and payments (data warehouse), Triangle builder (Spark), Development model (boosting), Uncertainty engine (bootstrap) and Actuary workbench (notebook UI), with Reserve report and Back-test archive off the critical path. |
| Optimise the right thing | The objective weighs poisson likelihood: a probability model for counts of events, so the model is trained on the cost of the decision and not on a generic score. |
| Handle large loss | Separate large losses and model them on their own with a different method. |

**Deliberately not doing**

- Handler: irrelevant.
- Policy number: arbitrary.
- Region code: noisy.

**How the approach is proven**

Prove it offline on Reserve error against ultimate and Interval coverage using time-ordered splits, then online on "Reserve volatility" with "Release or strengthening" as the guardrail. Watch for: Using final data in back-test and Long delays.

## Baseline and production design

- **Baseline (build this first):** Chain-ladder with actuarial adjustments, because it is the industry standard.
- **Production design:** Claim-level and triangle-level models blended with chain-ladder, bootstrap or quantile intervals and a drivers report.

## Why AI, and why this kind

**Why AI.** Estimate ultimate claim costs and their uncertainty by line and accident period to set reserves. The evidence that separates good from bad outcomes (Development factors, Open claim count and severity, Case reserve strength) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "calendar-year totals" are what teams reach for first, and they fail because changes in payment patterns hide in totals. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Claim-level and triangle-level models blended with chain-ladder, bootstrap or quantile intervals and a drivers report.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Development factors, Open claim count and severity, Case reserve strength and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Chain-ladder with actuarial adjustments, because it is the industry standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Claim-level and triangle-level models blended with chain-ladder, bootstrap or quantile intervals and a drivers report | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reserve volatility) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using final data in back-test.
- Evaluation trap: Long delays.
- Large loss: one large claim dominates the triangle and distorts the estimate.
- Process change: a faster payments process changes development patterns.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
