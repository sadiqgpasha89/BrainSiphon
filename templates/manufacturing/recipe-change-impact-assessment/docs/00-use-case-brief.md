# Recipe Change Impact Assessment: use-case brief

> Generated from the blueprint `manufacturing/recipe-change-impact-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Recipe Change Impact Assessment · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate the effect of a proposed recipe or parameter change on yield, quality and energy from past changes and process models, so engineers prioritise and de-risk trials. The system has to run as a scheduled batch job, inside these limits: Estimates with uncertainty and the evidence base, Change control approval remains mandatory and Model results never replace validation trials.

**Why it is hard.** The obvious approach is before and after on all lots, and it fails because other factors changed at the same time. The second trap is in "Uncertainty": the real signal is wide intervals when few precedents exist, while teams usually reach for a point estimate.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.6K a month. A mistake is expensive in the way time to validate changes measures it.

**What success looks like.** Offline: Calibration of effect estimates on past trials, Interval coverage and Rank correlation with realised value. Online: Trials with positive results, Time to validate changes and Failed trials. The launch is judged on "Trials with positive results" while "Time to validate changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate the effect of a proposed recipe or parameter change on yield, quality and energy from past changes and process models, so engineers prioritise and de-risk trials.

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

- Estimates with uncertainty and the evidence base
- Change control approval remains mandatory
- Model results never replace validation trials
- Weekly refresh of 2000 open change proposals

## The approach in one paragraph

Start with expert judgement in a change review board, because it is the current gate and the benchmark. Then earn the move to a causal effect model trained on matched historical changes with uncertainty, a ranked trial plan by expected value and a link to the change record, and only if it beats the baseline on Calibration of effect estimates on past trials and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Similar past changes | Changes of the same type on similar products. Precedent. Guard against: by parameter and product family. |
| Add Sensitivity from the process model | Modelled change in output per parameter unit. Mechanism. Guard against: needs a validated model. |
| Add Operating window margin | Distance of the new setting from limits. Risk. Guard against: from the recipe. |
| Run it as one pipeline | Change records and outcomes (change system and MES), Matching and effect estimation (causal model), Process model simulation (validated model), Uncertainty estimate (ensemble), Trial ranking (planning tool) and Outcome capture (results), with Change board review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle no precedent | Wide intervals and a pilot-first rule. |

**Deliberately not doing**

- Engineer name: not a driver.
- Change request number: an identifier.
- Ticket text length: weak link.

**How the approach is proven**

Prove it offline on Calibration of effect estimates on past trials, Interval coverage and Rank correlation with realised value using time-ordered splits, then online on "Trials with positive results" with "Time to validate changes" as the guardrail. Watch for: Before-and-after comparisons, Point estimates only and Treating the model as approval.

## Baseline and production design

- **Baseline (build this first):** Expert judgement in a change review board, because it is the current gate and the benchmark.
- **Production design:** A causal effect model trained on matched historical changes with uncertainty, a ranked trial plan by expected value and a link to the change record.

## Why AI, and why this kind

**Why AI.** Estimate the effect of a proposed recipe or parameter change on yield, quality and energy from past changes and process models, so engineers prioritise and de-risk trials. The evidence that separates good from bad outcomes (Similar past changes, Sensitivity from the process model, Operating window margin) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "before and after on all lots" are what teams reach for first, and they fail because other factors changed at the same time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A causal effect model trained on matched historical changes with uncertainty, a ranked trial plan by expected value and a link to the change record.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Similar past changes, Sensitivity from the process model, Operating window margin and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Expert judgement in a change review board, because it is the current gate and the benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A causal effect model trained on matched historical changes with uncertainty, a ranked trial plan by expected value and a link to the change record | chosen | Meets the run-window envelope at $0.904 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Trials with positive results) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Before-and-after comparisons.
- Evaluation trap: Point estimates only.
- No precedent: the change type is novel.
- Hidden confounder: another change happened at the same time.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
