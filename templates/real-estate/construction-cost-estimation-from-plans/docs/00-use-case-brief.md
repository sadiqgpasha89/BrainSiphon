# Construction Cost Estimation from Plans: use-case brief

> Generated from the blueprint `real-estate/construction-cost-estimation-from-plans` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Construction Cost Estimation from Plans · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate construction cost early from drawings, specifications and past projects, with quantity take-off support. The system has to run interactively, within a few seconds, inside these limits: Every estimate is a range with a stated confidence and never a single number, Assumptions on spec, site and escalation are listed with the estimate and A cost estimator reviews and approves before use.

**Why it is hard.** The obvious approach is floor area alone, and it fails because two buildings of equal area differ widely in cost because of shape, structure and services. The second trap is in "Escalation": the real signal is prices adjusted for time and region to the date of construction, while teams usually reach for historic cost used as it was.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $13.7K a month. A mistake is expensive in the way estimator time measures it.

**What success looks like.** Offline: Error by stage and Interval coverage. Online: Estimate vs final cost and Estimator time. The launch is judged on "Estimate vs final cost" while "Estimator time" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate construction cost early from drawings, specifications and past projects, with quantity take-off support.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\log\hat{c}-\log c)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},c)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{c} | The predicted cost (or procurement spend) in the same units as the actual cost. |
| c | The actual cost. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.9} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Every estimate is a range with a stated confidence and never a single number
- Assumptions on spec, site and escalation are listed with the estimate
- A cost estimator reviews and approves before use
- Costs adjusted with regional cost indices and the date of pricing

## The approach in one paragraph

Start with cost per square metre by building type, because estimators use it. Then earn the move to quantity extraction from plans, a cost model with retrieval of similar projects and intervals, and only if it beats the baseline on Error by stage and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Gross area and storeys | Gross floor area and number of storeys read from the plans. The base driver of cost. Guard against: plans differ on what counts as gross, so define it. |
| Add Spec level | Classifier score from finish schedules and notes for low, medium, high and luxury. Finish drives cost per square metre. Guard against: specifications are text and often incomplete. |
| Add Region index | Construction cost index of the project region relative to a base. Adjusts for local labour and materials. Guard against: indices lag, so update them often. |
| Run it as one pipeline | Plan intake (project system), Take-off extractor (vision model), Spec parser (NLP), Cost model (boosting) and Similar projects (retrieval), with Estimator review and Archive off the critical path. |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle early design | Show a wide range and narrow it as the design develops. |

**Deliberately not doing**

- Architect: Who drew the plan does not change the cost of building it.
- Drawing style: A cosmetic feature that varies by office and does not change quantities.
- Project name: A label with no cost information.

**How the approach is proven**

Prove it offline on Error by stage and Interval coverage using time-ordered splits, then online on "Estimate vs final cost" with "Estimator time" as the guardrail. Watch for: The final cost in the data includes changes, so it is not the cost of the plan as drawn and Few similar projects mean any benchmark is built on a handful of cases.

## Baseline and production design

- **Baseline (build this first):** Cost per square metre by building type, because estimators use it.
- **Production design:** Quantity extraction from plans, a cost model with retrieval of similar projects and intervals.

## Why AI, and why this kind

**Why AI.** Estimate construction cost early from drawings, specifications and past projects, with quantity take-off support. The evidence that separates good from bad outcomes (Gross area and storeys, Spec level, Region index) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "floor area alone" are what teams reach for first, and they fail because two buildings of equal area differ widely in cost because of shape, structure and services. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Quantity extraction from plans, a cost model with retrieval of similar projects and intervals.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Gross area and storeys, Spec level, Region index and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Cost per square metre by building type, because estimators use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantity extraction from plans, a cost model with retrieval of similar projects and intervals | chosen | Meets the 2500 ms envelope at $7.64 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Estimate vs final cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: The final cost in the data includes changes, so it is not the cost of the plan as drawn.
- Evaluation trap: Few similar projects mean any benchmark is built on a handful of cases.
- Early design: early design stages have little detail so a point estimate is false precision.
- Material price spike: a sudden spike in a material price such as steel breaks the estimate.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
