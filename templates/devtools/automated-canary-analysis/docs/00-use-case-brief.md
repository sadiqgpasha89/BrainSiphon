# Automated Canary Analysis: use-case brief

> Generated from the blueprint `devtools/automated-canary-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Canary Analysis · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare the canary version with the baseline on error rates, latency and business metrics and recommend promotion, hold or rollback with confidence, for the release owner to confirm. The system has to run interactively, within a few seconds, inside these limits: Decision recommended within 10 minutes of rollout step, Rollback is always a one-click human action and Statistical tests with multiple-testing control.

**Why it is hard.** The obvious approach is before and after comparison, and it fails because traffic changes confuse before and after. The second trap is in "Metrics": the real signal is service and business signals, while teams usually reach for errors only.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $4.7K a month. A mistake is expensive in the way rollbacks after full rollout measures it.

**What success looks like.** Offline: Detection rate of seeded faults, False rollback rate and Time to decision. Online: Bad releases caught in canary, Rollbacks after full rollout and Time in rollout. The launch is judged on "Bad releases caught in canary" while "Rollbacks after full rollout" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare the canary version with the baseline on error rates, latency and business metrics and recommend promotion, hold or rollback with confidence, for the release owner to confirm.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Decision recommended within 10 minutes of rollout step
- Rollback is always a one-click human action
- Statistical tests with multiple-testing control
- Metrics selected per service
- 5K services

## The approach in one paragraph

Start with engineers watching dashboards during rollouts, because it is the typical practice. Then earn the move to a statistical canary analyser with matched traffic, multiple-metric tests and a recommendation with plots, wired to the rollout tool with human confirmation, and only if it beats the baseline on Detection rate of seeded faults and False rollback rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Error rate difference | Canary versus baseline errors. Core. Guard against: from metrics. |
| Add Latency percentile difference | P95 and p99 changes. Core. Guard against: from metrics. |
| Add Business metric change | Conversions or throughput. Impact. Guard against: from analytics. |
| Run it as one pipeline | Metric collection (observability), Traffic matching (load balancer), Statistical comparison (canary analyser), Recommendation (rules), Release owner confirmation (CD system) and Action (rollout tool), with Outcome review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle low traffic | Longer observation and a wider decision window. |

**Deliberately not doing**

- Release author: personal data.
- Version label: an identifier.
- Dashboard colour: irrelevant.

**How the approach is proven**

Prove it offline on Detection rate of seeded faults, False rollback rate and Time to decision using time-ordered splits, then online on "Bad releases caught in canary" with "Rollbacks after full rollout" as the guardrail. Watch for: Before-and-after comparisons, Error-only metrics and Automatic promotion without limits.

## Baseline and production design

- **Baseline (build this first):** Engineers watching dashboards during rollouts, because it is the typical practice.
- **Production design:** A statistical canary analyser with matched traffic, multiple-metric tests and a recommendation with plots, wired to the rollout tool with human confirmation.

## Why AI, and why this kind

**Why AI.** Compare the canary version with the baseline on error rates, latency and business metrics and recommend promotion, hold or rollback with confidence, for the release owner to confirm. The evidence that separates good from bad outcomes (Error rate difference, Latency percentile difference, Business metric change) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "before and after comparison" are what teams reach for first, and they fail because traffic changes confuse before and after. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A statistical canary analyser with matched traffic, multiple-metric tests and a recommendation with plots, wired to the rollout tool with human confirmation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Error rate difference, Latency percentile difference, Business metric change and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Engineers watching dashboards during rollouts, because it is the typical practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A statistical canary analyser with matched traffic, multiple-metric tests and a recommendation with plots, wired to the rollout tool with human confirmation | chosen | Meets the 2500 ms envelope at $0.0053 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bad releases caught in canary) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Before-and-after comparisons.
- Evaluation trap: Error-only metrics.
- Low traffic: not enough requests.
- Seasonal load: a spike affects only one group.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
