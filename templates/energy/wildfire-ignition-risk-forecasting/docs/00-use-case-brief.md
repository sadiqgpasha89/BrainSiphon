# Wildfire Ignition Risk Forecasting: use-case brief

> Generated from the blueprint `energy/wildfire-ignition-risk-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wildfire Ignition Risk Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast the chance that conditions and equipment could start a fire for each network segment so operators and planners can decide on inspections, covered conductor work and temporary protection settings. The system has to run as a scheduled batch job, inside these limits: Segment risk for the next 72 hours with updates every 6 hours, Any power shutoff decision is made by named senior staff under the written protocol and Public safety above model output.

**Why it is hard.** The obvious approach is an automated shutoff trigger, and it fails because shutoffs affect safety and need accountable decisions. The second trap is in "Label": the real signal is ignition events and near misses with cause, while teams usually reach for fire counts alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $2.8K a month. A mistake is expensive in the way inspections targeted measures it.

**What success looks like.** Offline: Calibration of segment risk, Recall of ignition-prone conditions and Lead time. Online: Ignition events, Inspections targeted and Public safety decision quality. The launch is judged on "Ignition events" while "Inspections targeted" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast the chance that conditions and equipment could start a fire for each network segment so operators and planners can decide on inspections, covered conductor work and temporary protection settings.

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

- Segment risk for the next 72 hours with updates every 6 hours
- Any power shutoff decision is made by named senior staff under the written protocol
- Public safety above model output
- Explanations for every high-risk segment
- 200K segments

## The approach in one paragraph

Start with a fire weather index by region and fixed thresholds in the operating protocol, because it is how protocols work today. Then earn the move to a calibrated segment-level model combining weather, fuel and equipment features with scenario ranges and explanations, feeding a decision protocol with human sign-off, and only if it beats the baseline on Calibration of segment risk and Recall of ignition-prone conditions after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Wind gust and direction forecast | Forecast wind speed and direction. Main driver. Guard against: from weather models. |
| Add Fuel moisture and vegetation dryness | Fuel state. Spread potential. Guard against: from satellite and sensors. |
| Add Equipment type and condition | Conductor, hardware and protection type. Ignition source. Guard against: from the register. |
| Run it as one pipeline | Weather and fuel data intake (forecast and satellite feeds), Segment feature build (GIS and asset joins), Risk model (gradient boosting), Calibration (isotonic fit), Scenario ranges (ensembles), Risk map and brief (control room) and Decision log (audit store). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rapid weather shift | Frequent refresh and scenario views. |

**Deliberately not doing**

- Segment name: an identifier.
- Report author: irrelevant.
- Map layer name: an artefact.

**How the approach is proven**

Prove it offline on Calibration of segment risk, Recall of ignition-prone conditions and Lead time using time-ordered splits, then online on "Ignition events" with "Inspections targeted" as the guardrail. Watch for: Automated shutoff decisions, Single-point risk scores and Fire counts as the label.

## Baseline and production design

- **Baseline (build this first):** A fire weather index by region and fixed thresholds in the operating protocol, because it is how protocols work today.
- **Production design:** A calibrated segment-level model combining weather, fuel and equipment features with scenario ranges and explanations, feeding a decision protocol with human sign-off.

## Why AI, and why this kind

**Why AI.** Forecast the chance that conditions and equipment could start a fire for each network segment so operators and planners can decide on inspections, covered conductor work and temporary protection settings. The evidence that separates good from bad outcomes (Wind gust and direction forecast, Fuel moisture and vegetation dryness, Equipment type and condition) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "an automated shutoff trigger" are what teams reach for first, and they fail because shutoffs affect safety and need accountable decisions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated segment-level model combining weather, fuel and equipment features with scenario ranges and explanations, feeding a decision protocol with human sign-off.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Wind gust and direction forecast, Fuel moisture and vegetation dryness, Equipment type and condition and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A fire weather index by region and fixed thresholds in the operating protocol, because it is how protocols work today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated segment-level model combining weather, fuel and equipment features with scenario ranges and explanations, feeding a decision protocol with human sign-off | chosen | Meets the run-window envelope at $0.031 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Ignition events) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automated shutoff decisions.
- Evaluation trap: Single-point risk scores.
- Rapid weather shift: the forecast changes in hours.
- Rare event: few ignitions in training.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
