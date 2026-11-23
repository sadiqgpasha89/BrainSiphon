# Early-Stage Cost Estimation: use-case brief

> Generated from the blueprint `engineering/early-stage-cost-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Early-Stage Cost Estimation · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate project cost ranges from early scope and design parameters using past projects, so owners and planners understand likely cost before detailed design. The system has to run interactively, within a few seconds, inside these limits: Estimates shown as ranges with drivers, Estimators review before sharing and Past project data normalised for inflation and location.

**Why it is hard.** The obvious approach is early budget, and it fails because budgets are not outcomes. The second trap is in "Output": the real signal is range with confidence, while teams usually reach for a single number.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $12.3K a month. A mistake is expensive in the way time to estimate measures it.

**What success looks like.** Offline: Calibration of ranges, Estimate error by stage and Driver accuracy. Online: Estimate to outturn variance, Time to estimate and Early budget revisions. The launch is judged on "Estimate to outturn variance" while "Time to estimate" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate project cost ranges from early scope and design parameters using past projects, so owners and planners understand likely cost before detailed design.

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

- Estimates shown as ranges with drivers
- Estimators review before sharing
- Past project data normalised for inflation and location
- Estimate within 1 minute
- 20K past projects

## The approach in one paragraph

Start with cost per square metre rules applied by estimators, because they are the common approach. Then earn the move to a model trained on normalised past projects that produces cost ranges and drivers, with estimator review and tracking against outturn cost, and only if it beats the baseline on Calibration of ranges and Estimate error by stage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Scope drivers | Size, type and complexity. Core. Guard against: from the brief. |
| Add Location and market index | Cost level by region. Adjustment. Guard against: from indices. |
| Add Similar past projects | Cost per unit of similar work. Core. Guard against: from the database. |
| Run it as one pipeline | Brief intake (estimating tool), Feature extraction (NLP and forms), Cost model (gradient boosting), Range calibration (quantile regression), Estimate record (bid system) and Outturn comparison (project close), with Estimator review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle novel project type | Wide ranges and analogue search. |

**Deliberately not doing**

- Estimator name: personal data.
- Client brand: weak link.
- Project nickname: irrelevant.

**How the approach is proven**

Prove it offline on Calibration of ranges, Estimate error by stage and Driver accuracy using time-ordered splits, then online on "Estimate to outturn variance" with "Time to estimate" as the guardrail. Watch for: Early budget as label, Single-number estimates and Automatic budget setting.

## Baseline and production design

- **Baseline (build this first):** Cost per square metre rules applied by estimators, because they are the common approach.
- **Production design:** A model trained on normalised past projects that produces cost ranges and drivers, with estimator review and tracking against outturn cost.

## Why AI, and why this kind

**Why AI.** Estimate project cost ranges from early scope and design parameters using past projects, so owners and planners understand likely cost before detailed design. The evidence that separates good from bad outcomes (Scope drivers, Location and market index, Similar past projects) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "early budget" are what teams reach for first, and they fail because budgets are not outcomes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A model trained on normalised past projects that produces cost ranges and drivers, with estimator review and tracking against outturn cost.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Scope drivers, Location and market index, Similar past projects and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Cost per square metre rules applied by estimators, because they are the common approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A model trained on normalised past projects that produces cost ranges and drivers, with estimator review and tracking against outturn cost | chosen | Meets the 2500 ms envelope at $0.137 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Estimate to outturn variance) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Early budget as label.
- Evaluation trap: Single-number estimates.
- Novel project type: no similar projects exist.
- Inflation shock: material prices jump after the estimate is issued.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
