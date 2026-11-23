# Change Order Impact Assessment: use-case brief

> Generated from the blueprint `engineering/change-order-impact-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Change Order Impact Assessment · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate the cost and time impact of proposed changes and link them to the contract basis so commercial managers evaluate and negotiate with evidence. The system has to run interactively, within a few seconds, inside these limits: Estimates shown as ranges with assumptions, Commercial managers decide and Contract entitlement checked by counsel.

**Why it is hard.** The obvious approach is verbal agreements, and it fails because verbal changes cause disputes. The second trap is in "Output": the real signal is cost and time ranges, while teams usually reach for a single figure.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $12.3K a month. A mistake is expensive in the way disputes measures it.

**What success looks like.** Offline: Cost estimate error, Activity link accuracy and Entitlement citation accuracy. Online: Time to price changes, Disputes and Unapproved work. The launch is judged on "Time to price changes" while "Disputes" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate the cost and time impact of proposed changes and link them to the contract basis so commercial managers evaluate and negotiate with evidence.

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

- Estimates shown as ranges with assumptions
- Commercial managers decide
- Contract entitlement checked by counsel
- Impact within 10 minutes
- 50K change events

## The approach in one paragraph

Start with estimators pricing each change by hand, because it is the usual practice. Then earn the move to an assessment tool that finds affected activities and quantities, prices with rates, estimates time effect and presents a cited entitlement summary for commercial managers, and only if it beats the baseline on Cost estimate error and Activity link accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Change scope | What changes in the design. Core. Guard against: from the change request. |
| Add Affected activities | Linked schedule activities. Time. Guard against: from the schedule. |
| Add Unit rates | Cost of similar work. Cost. Guard against: from the cost database. |
| Run it as one pipeline | Change request (project platform), Scope extraction (NLP), Activity and quantity link (schedule and model), Cost and time estimate (models), Entitlement summary (LLM with citations) and Decision record (contract system), with Commercial review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle disputed scope | Evidence pack and neutral log. |

**Deliberately not doing**

- Requester name: personal data.
- Change number: an identifier.
- Document layout: an artefact.

**How the approach is proven**

Prove it offline on Cost estimate error, Activity link accuracy and Entitlement citation accuracy using time-ordered splits, then online on "Time to price changes" with "Disputes" as the guardrail. Watch for: Verbal agreements as basis, Single figures and Automatic approval.

## Baseline and production design

- **Baseline (build this first):** Estimators pricing each change by hand, because it is the usual practice.
- **Production design:** An assessment tool that finds affected activities and quantities, prices with rates, estimates time effect and presents a cited entitlement summary for commercial managers.

## Why AI, and why this kind

**Why AI.** Estimate the cost and time impact of proposed changes and link them to the contract basis so commercial managers evaluate and negotiate with evidence. The evidence that separates good from bad outcomes (Change scope, Affected activities, Unit rates) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "verbal agreements" are what teams reach for first, and they fail because verbal changes cause disputes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: An assessment tool that finds affected activities and quantities, prices with rates, estimates time effect and presents a cited entitlement summary for commercial managers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Change scope, Affected activities, Unit rates and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Estimators pricing each change by hand, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An assessment tool that finds affected activities and quantities, prices with rates, estimates time effect and presents a cited entitlement summary for commercial managers | chosen | Meets the 2500 ms envelope at $0.273 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to price changes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Verbal agreements as basis.
- Evaluation trap: Single figures.
- Disputed scope: parties disagree on scope.
- Concurrent delay: several causes overlap.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
