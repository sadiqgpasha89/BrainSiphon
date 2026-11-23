# Transformer DGA Fault Classification: use-case brief

> Generated from the blueprint `energy/transformer-dga-fault-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Transformer DGA Fault Classification · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify the likely fault type in a transformer from dissolved gas trends and online monitors so the right inspection or outage is planned. The system has to run as a scheduled batch job, inside these limits: Fault class with confidence, Trend and rate-of-change alerts and Engineers confirm before action.

**Why it is hard.** The obvious approach is rule-based gas ratios, and it fails because ratio methods mislabel mixed faults. The second trap is in "Trend": the real signal is gas generation rate over time, while teams usually reach for a single sample.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way unnecessary outages measures it.

**What success looks like.** Offline: Class accuracy on confirmed faults, Calibration and Lead time of useful alerts. Online: Faults found before failure, Unnecessary outages and Inspection cost. The launch is judged on "Faults found before failure" while "Unnecessary outages" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify the likely fault type in a transformer from dissolved gas trends and online monitors so the right inspection or outage is planned.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Fault class with confidence
- Trend and rate-of-change alerts
- Engineers confirm before action
- Handles lab and online monitor data
- 100K transformers

## The approach in one paragraph

Start with standard gas ratio methods and limits from industry guides, because engineers know and trust them. Then earn the move to a classifier combining ratio features, gas rates and loading context with confidence and abstention, checked against the standard method and routed to engineer review, and only if it beats the baseline on Class accuracy on confirmed faults and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Gas concentrations | Levels of key gases. Fault type. Guard against: from lab or monitor. |
| Add Gas generation rate | Change per month in key gases. Urgency. Guard against: time series. |
| Add Load and temperature context | Loading and oil temperature. Confounder. Guard against: from SCADA. |
| Run it as one pipeline | Gas data intake (lab and monitor systems), Cleaning and alignment (time series), Feature build (ratios and rates), Fault classifier (gradient boosting), Standard method check (rules) and Outcome logging (inspection results), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sampling error | Outlier checks and resampling advice. |

**Deliberately not doing**

- Lab name: an identifier.
- Sample bottle id: an identifier.
- Report author: irrelevant.

**How the approach is proven**

Prove it offline on Class accuracy on confirmed faults, Calibration and Lead time of useful alerts using time-ordered splits, then online on "Faults found before failure" with "Unnecessary outages" as the guardrail. Watch for: Ratio methods alone, Single-sample decisions and Ignoring treatment events.

## Baseline and production design

- **Baseline (build this first):** Standard gas ratio methods and limits from industry guides, because engineers know and trust them.
- **Production design:** A classifier combining ratio features, gas rates and loading context with confidence and abstention, checked against the standard method and routed to engineer review.

## Why AI, and why this kind

**Why AI.** Classify the likely fault type in a transformer from dissolved gas trends and online monitors so the right inspection or outage is planned. The evidence that separates good from bad outcomes (Gas concentrations, Gas generation rate, Load and temperature context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "rule-based gas ratios" are what teams reach for first, and they fail because ratio methods mislabel mixed faults. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A classifier combining ratio features, gas rates and loading context with confidence and abstention, checked against the standard method and routed to engineer review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Gas concentrations, Gas generation rate, Load and temperature context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Standard gas ratio methods and limits from industry guides, because engineers know and trust them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier combining ratio features, gas rates and loading context with confidence and abstention, checked against the standard method and routed to engineer review | chosen | Meets the run-window envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Faults found before failure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ratio methods alone.
- Evaluation trap: Single-sample decisions.
- Sampling error: a contaminated sample shows odd gases.
- Oil treatment: gases drop after degassing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
