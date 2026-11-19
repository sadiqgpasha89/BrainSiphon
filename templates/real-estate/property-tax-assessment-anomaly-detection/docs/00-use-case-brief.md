# Property Tax Assessment Anomaly Detection: use-case brief

> Generated from the blueprint `real-estate/property-tax-assessment-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Property Tax Assessment Anomaly Detection · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find properties whose assessed value is far from their expected market value so assessors fix inequity and appeal risk. The system has to run as a scheduled batch job, inside these limits: Assessments are equitable across areas and property types, Each flagged anomaly has an explanation an assessor can check and The owner's right to appeal is unaffected.

**Why it is hard.** The obvious approach is the assessed value alone, and it fails because the ratio shows whether a home is over or under-assessed relative to the market. The second trap is in "Fairness": the real signal is equal treatment across price bands and neighbourhoods, while teams usually reach for average accuracy.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way equity measures measures it.

**What success looks like.** Offline: COD and PRD and Anomaly precision. Online: Appeal rate and Equity measures. The launch is judged on "Appeal rate" while "Equity measures" must not get worse.

## Objective, loss and constraints

**Business objective.** Find properties whose assessed value is far from their expected market value so assessors fix inequity and appeal risk.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\log\hat{y}-\log y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.9} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Assessments are equitable across areas and property types
- Each flagged anomaly has an explanation an assessor can check
- The owner's right to appeal is unaffected
- Run in the annual assessment cycle with time to correct before notices

## The approach in one paragraph

Start with periodic reassessment by area factors, because it is common. Then earn the move to aVM-based expected value with anomaly scoring and a review list for assessors, and only if it beats the baseline on COD and PRD and Anomaly precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Assessment ratio | Assessed value divided by the adjusted sale price for recent sales. The standard equity measure. Guard against: few sales in an area give noisy ratios. |
| Add Neighbourhood ratio | Median ratio of comparable properties in the same neighbourhood. Puts a property's ratio in context. Guard against: neighbourhood boundaries are arbitrary. |
| Add Unrecorded changes | Building permits and aerial change detections not reflected in the record. Finds under-assessed properties. Guard against: permit data are incomplete. |
| Run it as one pipeline | Assessment roll (county), Sales (registry), AVM (boosting), Anomaly scorer (model), Assessor tool (UI) and Outcome log (warehouse), with Review list off the critical path. |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle few sales | Use wider intervals or pool nearby areas. |

**Deliberately not doing**

- Owner: The owner's identity should not affect an assessment.
- Parcel ID: An administrative key with no value signal.
- Appeal count: Weak, as appeals depend on owners' resources more than on error.

**How the approach is proven**

Prove it offline on COD and PRD and Anomaly precision using time-ordered splits, then online on "Appeal rate" with "Equity measures" as the guardrail. Watch for: Sales selection, since sales are not a random sample of properties and Stale attributes in the training data make the model learn the errors of the records.

## Baseline and production design

- **Baseline (build this first):** Periodic reassessment by area factors, because it is common.
- **Production design:** AVM-based expected value with anomaly scoring and a review list for assessors.

## Why AI, and why this kind

**Why AI.** Find properties whose assessed value is far from their expected market value so assessors fix inequity and appeal risk. The evidence that separates good from bad outcomes (Assessment ratio, Neighbourhood ratio, Unrecorded changes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the assessed value alone" are what teams reach for first, and they fail because the ratio shows whether a home is over or under-assessed relative to the market. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: AVM-based expected value with anomaly scoring and a review list for assessors.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Assessment ratio, Neighbourhood ratio, Unrecorded changes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic reassessment by area factors, because it is common | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| AVM-based expected value with anomaly scoring and a review list for assessors | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Appeal rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Sales selection, since sales are not a random sample of properties.
- Evaluation trap: Stale attributes in the training data make the model learn the errors of the records.
- Few sales: few sales in an area leave the expected value uncertain.
- New build: a new build has no sale history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
