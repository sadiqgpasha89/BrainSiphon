# Site Battery & Power Failure Prediction: use-case brief

> Generated from the blueprint `telecom/site-power-battery-failure-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Site Battery & Power Failure Prediction · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict battery, rectifier and mains failures at radio sites so spares and crews arrive before the site goes down. The system has to run as a scheduled batch job, inside these limits: Lead time of at least 7 days for battery replacement, Priority ranking by customer impact and Alerts auditable by operations.

**Why it is hard.** The obvious approach is any alarm, and it fails because many alarms are minor. The second trap is in "Health": the real signal is discharge behaviour during real outages, while teams usually reach for static voltage readings.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $3.5K a month. A mistake is expensive in the way batteries replaced early measures it.

**What success looks like.** Offline: Precision and recall at 7 and 30 days, Lead time and Calibration. Online: Site outages due to power, Batteries replaced early and Generator callouts. The launch is judged on "Site outages due to power" while "Batteries replaced early" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict battery, rectifier and mains failures at radio sites so spares and crews arrive before the site goes down.

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

- Lead time of at least 7 days for battery replacement
- Priority ranking by customer impact
- Alerts auditable by operations
- Scores for 150K sites daily

## The approach in one paragraph

Start with replace batteries by age, because it is the usual maintenance policy. Then earn the move to a survival model on discharge and float features with impact-ranked work lists and a spares forecast for each depot, and only if it beats the baseline on Precision and recall at 7 and 30 days and Lead time after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Autonomy time during outages | Hours the battery held the load in the last outages. Capacity proxy. Guard against: from site logs. |
| Add Float voltage and temperature trend | Slope of float voltage and temperature. Ageing. Guard against: calibrate per model. |
| Add Mains outage frequency | Mains drops per month. Stress. Guard against: from alarms. |
| Run it as one pipeline | Telemetry ingestion (monitoring), Discharge event extraction (batch), Health model (survival model), Impact ranking (customer join), Work list (asset system), Spares forecast (planning) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle no outages in the window | Use proxies and widen intervals. |

**Deliberately not doing**

- Site name: an identifier.
- Technician on last visit: no link.
- Alarm text: vendor formatting.

**How the approach is proven**

Prove it offline on Precision and recall at 7 and 30 days, Lead time and Calibration using time-ordered splits, then online on "Site outages due to power" with "Batteries replaced early" as the guardrail. Watch for: Replacing by age only, Ignoring discharge tests and Ranking by risk alone.

## Baseline and production design

- **Baseline (build this first):** Replace batteries by age, because it is the usual maintenance policy.
- **Production design:** A survival model on discharge and float features with impact-ranked work lists and a spares forecast for each depot.

## Why AI, and why this kind

**Why AI.** Predict battery, rectifier and mains failures at radio sites so spares and crews arrive before the site goes down. The evidence that separates good from bad outcomes (Autonomy time during outages, Float voltage and temperature trend, Mains outage frequency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any alarm" are what teams reach for first, and they fail because many alarms are minor. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A survival model on discharge and float features with impact-ranked work lists and a spares forecast for each depot.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Autonomy time during outages, Float voltage and temperature trend, Mains outage frequency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Replace batteries by age, because it is the usual maintenance policy | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A survival model on discharge and float features with impact-ranked work lists and a spares forecast for each depot | chosen | Meets the run-window envelope at $0.0016 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Site outages due to power) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replacing by age only.
- Evaluation trap: Ignoring discharge tests.
- No outages in the window: no discharge evidence.
- Heat wave: batteries age faster.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
