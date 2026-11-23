# Distribution Outage Prediction: use-case brief

> Generated from the blueprint `energy/distribution-outage-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Distribution Outage Prediction · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict the chance of outages on each feeder section over the next days from weather, vegetation, asset age and history, so crews and spares are pre-positioned before storms. The system has to run as a scheduled batch job, inside these limits: Risk score per feeder section for 72 hours ahead, Calibrated probabilities for crew planning and Refresh every 3 hours during weather alerts.

**Why it is hard.** The obvious approach is customer calls, and it fails because calls cluster around a few sections and miss quiet failures. The second trap is in "Weather": the real signal is forecast wind, ice and lightning at the section, while teams usually reach for observed weather after the fact.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $3.2K a month. A mistake is expensive in the way restoration time measures it.

**What success looks like.** Offline: Rank accuracy of risky sections, Calibration by storm class and Lead time of useful warnings. Online: Customer minutes lost, Restoration time and Crew mobilisation accuracy. The launch is judged on "Customer minutes lost" while "Restoration time" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict the chance of outages on each feeder section over the next days from weather, vegetation, asset age and history, so crews and spares are pre-positioned before storms.

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

- Risk score per feeder section for 72 hours ahead
- Calibrated probabilities for crew planning
- Refresh every 3 hours during weather alerts
- Explanations name the top drivers
- 400K feeder sections

## The approach in one paragraph

Start with historical outage rate per section scaled by the weather severity class, because planners use a similar rule. Then earn the move to a calibrated gradient boosting model on weather forecast, vegetation and asset features per section with storm-scenario scoring and a ranked crew pre-positioning list, and only if it beats the baseline on Rank accuracy of risky sections and Calibration by storm class after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Forecast wind gust and lightning | Forecast gust speed and strike density at the section. Main storm driver. Guard against: interpolated to sections. |
| Add Vegetation density near the line | Canopy cover within the corridor. Tree contact risk. Guard against: from imagery or survey. |
| Add Asset age and condition | Age of conductors, poles and switches. Failure propensity. Guard against: from the asset register. |
| Run it as one pipeline | Weather forecast ingestion (forecast feeds), Section feature build (GIS and asset joins), Outage risk model (gradient boosting), Calibration (isotonic fit), Ranked section list (ADMS console) and Outcome comparison (post-event), with Planner review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle unprecedented storm | Wider intervals and a rule-based severity floor. |

**Deliberately not doing**

- Feeder name: an identifier.
- Substation code alone: an identifier.
- Report author: irrelevant.

**How the approach is proven**

Prove it offline on Rank accuracy of risky sections, Calibration by storm class and Lead time of useful warnings using time-ordered splits, then online on "Customer minutes lost" with "Restoration time" as the guardrail. Watch for: Using customer calls as labels, Scoring only after the event and Uncalibrated storm scores.

## Baseline and production design

- **Baseline (build this first):** Historical outage rate per section scaled by the weather severity class, because planners use a similar rule.
- **Production design:** A calibrated gradient boosting model on weather forecast, vegetation and asset features per section with storm-scenario scoring and a ranked crew pre-positioning list.

## Why AI, and why this kind

**Why AI.** Predict the chance of outages on each feeder section over the next days from weather, vegetation, asset age and history, so crews and spares are pre-positioned before storms. The evidence that separates good from bad outcomes (Forecast wind gust and lightning, Vegetation density near the line, Asset age and condition) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "customer calls" are what teams reach for first, and they fail because calls cluster around a few sections and miss quiet failures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated gradient boosting model on weather forecast, vegetation and asset features per section with storm-scenario scoring and a ranked crew pre-positioning list.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Forecast wind gust and lightning, Vegetation density near the line, Asset age and condition and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Historical outage rate per section scaled by the weather severity class, because planners use a similar rule | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated gradient boosting model on weather forecast, vegetation and asset features per section with storm-scenario scoring and a ranked crew pre-positioning list | chosen | Meets the run-window envelope at $0.035 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Customer minutes lost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using customer calls as labels.
- Evaluation trap: Scoring only after the event.
- Unprecedented storm: the event is outside the training range.
- Asset data gap: the register lacks the pole age.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
