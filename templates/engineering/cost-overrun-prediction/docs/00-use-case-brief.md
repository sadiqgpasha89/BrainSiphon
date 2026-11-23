# Cost Overrun Prediction: use-case brief

> Generated from the blueprint `engineering/cost-overrun-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cost Overrun Prediction · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict final project cost and the likelihood of overrun from commitments, progress and change orders, naming drivers so cost managers can act early. The system has to run as a scheduled batch job, inside these limits: Forecast shown as a range, Drivers named by cost code and Cost managers own the forecast.

**Why it is hard.** The obvious approach is mid-project forecasts, and it fails because forecasts can be wrong. The second trap is in "Level": the real signal is project and cost code, while teams usually reach for individual manager comparison.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way time to detect overruns measures it.

**What success looks like.** Offline: Calibration, Forecast error by project stage and Driver accuracy. Online: Cost overrun rate, Time to detect overruns and Contingency use. The launch is judged on "Cost overrun rate" while "Time to detect overruns" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict final project cost and the likelihood of overrun from commitments, progress and change orders, naming drivers so cost managers can act early.

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

- Forecast shown as a range
- Drivers named by cost code
- Cost managers own the forecast
- Calibrated overrun probabilities
- Monthly refresh for 2,000 projects

## The approach in one paragraph

Start with earned value analysis with manual contingency, because it is the standard method. Then earn the move to a forecasting model that adjusts earned value with change order patterns and price indices, outputs overrun probabilities and ranks cost codes by risk, and only if it beats the baseline on Calibration and Forecast error by project stage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Earned value indicators | Cost and schedule performance indices. Core. Guard against: from cost control. |
| Add Committed cost and change orders | Commitments and approved changes. Core. Guard against: from the ledger. |
| Add Productivity rates | Actual versus planned. Driver. Guard against: from site data. |
| Run it as one pipeline | Cost and commitment data (cost system), Feature build (batch), Overrun model (gradient boosting), Calibration (isotonic fit), Driver attribution (explanations) and Outcome tracking (project close), with Cost manager review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle large claim | Scenario adjustments. |

**Deliberately not doing**

- Manager name: personal data.
- Invoice number: an identifier.
- Report layout: an artefact.

**How the approach is proven**

Prove it offline on Calibration, Forecast error by project stage and Driver accuracy using time-ordered splits, then online on "Cost overrun rate" with "Time to detect overruns" as the guardrail. Watch for: Linear extrapolation, Individual manager comparison and Mid-project forecasts as labels.

## Baseline and production design

- **Baseline (build this first):** Earned value analysis with manual contingency, because it is the standard method.
- **Production design:** A forecasting model that adjusts earned value with change order patterns and price indices, outputs overrun probabilities and ranks cost codes by risk.

## Why AI, and why this kind

**Why AI.** Predict final project cost and the likelihood of overrun from commitments, progress and change orders, naming drivers so cost managers can act early. The evidence that separates good from bad outcomes (Earned value indicators, Committed cost and change orders, Productivity rates) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "mid-project forecasts" are what teams reach for first, and they fail because forecasts can be wrong. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A forecasting model that adjusts earned value with change order patterns and price indices, outputs overrun probabilities and ranks cost codes by risk.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Earned value indicators, Committed cost and change orders, Productivity rates and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Earned value analysis with manual contingency, because it is the standard method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A forecasting model that adjusts earned value with change order patterns and price indices, outputs overrun probabilities and ranks cost codes by risk | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost overrun rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Linear extrapolation.
- Evaluation trap: Individual manager comparison.
- Large claim: one dispute shifts final cost.
- Currency swings: prices move with exchange rates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
