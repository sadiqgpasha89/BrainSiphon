# Device Upgrade Propensity: use-case brief

> Generated from the blueprint `telecom/device-upgrade-propensity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Device Upgrade Propensity · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which customers are likely to upgrade a handset soon so retail, logistics and campaigns plan stock and offers sensibly. The system has to run as a scheduled batch job, inside these limits: Use only consented marketing data, Predictions per device model for stock planning and Refreshed weekly for 20M customers.

**Why it is hard.** The obvious approach is store visits, and it fails because visits do not always lead to upgrades. The second trap is in "Timing": the real signal is launch calendar and contract end, while teams usually reach for calendar-free scoring.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way upgrade campaign conversion measures it.

**What success looks like.** Offline: AUC and top-decile lift, Device-level forecast error and Regional stock plan error. Online: Stock outs, Upgrade campaign conversion and Excess stock. The launch is judged on "Stock outs" while "Upgrade campaign conversion" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which customers are likely to upgrade a handset soon so retail, logistics and campaigns plan stock and offers sensibly.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Use only consented marketing data
- Predictions per device model for stock planning
- Refreshed weekly for 20M customers
- Offers must stay within fair-treatment rules

## The approach in one paragraph

Start with a rule that flags customers whose device is more than 24 months old and contract ended, because retail already uses it. Then earn the move to gradient boosting for propensity and a forecast of device-level demand by region, with a campaign list and stock plan view, and only if it beats the baseline on AUC and top-decile lift and Device-level forecast error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Device age | Months since the device was acquired. Main driver. Guard against: from the device record. |
| Add Contract and instalment status | Months left on the plan or payment. Upgrade eligibility. Guard against: from billing. |
| Add Battery and performance proxies | Device health indicators with consent. Need to replace. Guard against: only with consent. |
| Run it as one pipeline | Device and billing features (lakehouse), Propensity model (gradient boosting), Demand aggregation (batch), Region forecast (time-series model), Campaign list (CRM), Stock plan (supply planning) and Outcome tracking (weekly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new device launch | Use similar devices as priors. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Colour preference: weak link.
- Store opening hours: no link.

**How the approach is proven**

Prove it offline on AUC and top-decile lift, Device-level forecast error and Regional stock plan error using time-ordered splits, then online on "Stock outs" with "Upgrade campaign conversion" as the guardrail. Watch for: Counting visits as upgrades, Ignoring launches and National-only stock plans.

## Baseline and production design

- **Baseline (build this first):** A rule that flags customers whose device is more than 24 months old and contract ended, because retail already uses it.
- **Production design:** Gradient boosting for propensity and a forecast of device-level demand by region, with a campaign list and stock plan view.

## Why AI, and why this kind

**Why AI.** Predict which customers are likely to upgrade a handset soon so retail, logistics and campaigns plan stock and offers sensibly. The evidence that separates good from bad outcomes (Device age, Contract and instalment status, Battery and performance proxies) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "store visits" are what teams reach for first, and they fail because visits do not always lead to upgrades. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting for propensity and a forecast of device-level demand by region, with a campaign list and stock plan view.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Device age, Contract and instalment status, Battery and performance proxies and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rule that flags customers whose device is more than 24 months old and contract ended, because retail already uses it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting for propensity and a forecast of device-level demand by region, with a campaign list and stock plan view | chosen | Meets the run-window envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Stock outs) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting visits as upgrades.
- Evaluation trap: Ignoring launches.
- New device launch: the new device has no upgrade history.
- Supply shortage: demand cannot be met.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
