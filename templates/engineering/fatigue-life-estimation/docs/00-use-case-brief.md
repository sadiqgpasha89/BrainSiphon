# Fatigue Life Estimation: use-case brief

> Generated from the blueprint `engineering/fatigue-life-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fatigue Life Estimation · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate fatigue damage accumulation in structures and components from measured load histories, to plan inspections and repairs with safety margins. The system has to run as a scheduled batch job, inside these limits: Damage estimates include uncertainty, Safety factors from codes applied and Engineers approve inspection plans.

**Why it is hard.** The obvious approach is average load, and it fails because fatigue depends on cycles and range. The second trap is in "Safety": the real signal is code safety factors, while teams usually reach for model-only life.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way inspection cost measures it.

**What success looks like.** Offline: Damage estimate error in test cases, Calibration and Sensitivity accuracy. Online: Fatigue cracks found late, Inspection cost and Assets beyond design life. The launch is judged on "Fatigue cracks found late" while "Inspection cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate fatigue damage accumulation in structures and components from measured load histories, to plan inspections and repairs with safety margins.

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

- Damage estimates include uncertainty
- Safety factors from codes applied
- Engineers approve inspection plans
- Load data checked
- 100K load cycles per day per asset

## The approach in one paragraph

Start with design life assumptions and fixed inspection intervals, because they are the standard approach. Then earn the move to a damage tracking service that counts load cycles, applies material curves and safety factors and outputs remaining life ranges and inspection suggestions for engineers, and only if it beats the baseline on Damage estimate error in test cases and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Load cycle histogram | Counted cycles and ranges. Core. Guard against: from sensor data. |
| Add Material fatigue curve | S-N curve. Core. Guard against: from standards. |
| Add Hot spot stress | Stress at critical details. Core. Guard against: from models. |
| Run it as one pipeline | Load data (sensors), Cycle counting (rainflow analysis), Stress mapping (finite element models), Damage accumulation (fatigue model), Remaining life range (analytics) and Inspection plan (asset management), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle overload event | Event damage checks. |

**Deliberately not doing**

- Sensor id: an identifier.
- Operator name: personal data.
- Report layout: an artefact.

**How the approach is proven**

Prove it offline on Damage estimate error in test cases, Calibration and Sensitivity accuracy using time-ordered splits, then online on "Fatigue cracks found late" with "Inspection cost" as the guardrail. Watch for: Average load, Model-only life and Unchecked sensors.

## Baseline and production design

- **Baseline (build this first):** Design life assumptions and fixed inspection intervals, because they are the standard approach.
- **Production design:** A damage tracking service that counts load cycles, applies material curves and safety factors and outputs remaining life ranges and inspection suggestions for engineers.

## Why AI, and why this kind

**Why AI.** Estimate fatigue damage accumulation in structures and components from measured load histories, to plan inspections and repairs with safety margins. The evidence that separates good from bad outcomes (Load cycle histogram, Material fatigue curve, Hot spot stress) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average load" are what teams reach for first, and they fail because fatigue depends on cycles and range. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A damage tracking service that counts load cycles, applies material curves and safety factors and outputs remaining life ranges and inspection suggestions for engineers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Load cycle histogram, Material fatigue curve, Hot spot stress and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Design life assumptions and fixed inspection intervals, because they are the standard approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A damage tracking service that counts load cycles, applies material curves and safety factors and outputs remaining life ranges and inspection suggestions for engineers | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fatigue cracks found late) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Average load.
- Evaluation trap: Model-only life.
- Overload event: one extreme load occurs.
- Missing data: a sensor stops reporting for several days.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
