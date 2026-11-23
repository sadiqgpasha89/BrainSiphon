# Inline Quality Prediction from Process Data: use-case brief

> Generated from the blueprint `manufacturing/inline-quality-prediction-from-process-data` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Inline Quality Prediction from Process Data · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict a lot or part's final quality result from process parameters while it is still being made so engineers can adjust or divert before value is added. The system has to run interactively, within a few seconds, inside these limits: Prediction available before the next process step, Explanation of the top drivers shown to the operator and Model retrained on each new product family.

**Why it is hard.** The obvious approach is interim readings, and it fails because interim values are not the customer's requirement. The second trap is in "Alignment": the real signal is process data aligned to the part by time and position, while teams usually reach for averages over the shift.

**Scale and stakes.** At 10 million users this is about 18.0M model-touching events a day, 208 requests per second on average and 1.3K at peak, at an estimated $8.2K a month. A mistake is expensive in the way lots diverted early measures it.

**What success looks like.** Offline: AUC and calibration by product family, Recall at fixed intervention capacity and Lead time before the next step. Online: Scrap and rework rate, Lots diverted early and Engineer response time. The launch is judged on "Scrap and rework rate" while "Lots diverted early" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict a lot or part's final quality result from process parameters while it is still being made so engineers can adjust or divert before value is added.

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

- Prediction available before the next process step
- Explanation of the top drivers shown to the operator
- Model retrained on each new product family
- No automatic parameter changes
- 100K lots per day

## The approach in one paragraph

Start with control charts on the key parameters with fixed limits, because engineers use them and the model should add value beyond them. Then earn the move to gradient boosting on aligned process features with monotonic constraints where physics is known, calibrated probabilities, and SHAP-style reasons shown beside the lot in the MES screen, and only if it beats the baseline on AUC and calibration by product family and Recall at fixed intervention capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Parameter deviation from the recipe | Difference between actual and recipe values per step. Excursion detector. Guard against: align by step. |
| Add Dwell and cycle time | Time in each step against the standard. Process stress. Guard against: from MES timestamps. |
| Add Material lot properties | Supplier test values for the input lot. Input variation. Guard against: join by lot. |
| Run it as one pipeline | Process data capture (historian), Alignment to part or lot (batch joins), Feature build (per-step aggregates), Quality model (gradient boosting), Reason display (MES screen), Engineer action log (MES) and Outcome labels (test results join). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new recipe | Use physics-based priors and a conservative threshold. |

**Deliberately not doing**

- Operator name: not a process driver.
- Lot number: an identifier.
- Day of week alone: confounded.

**How the approach is proven**

Prove it offline on AUC and calibration by product family, Recall at fixed intervention capacity and Lead time before the next step using time-ordered splits, then online on "Scrap and rework rate" with "Lots diverted early" as the guardrail. Watch for: Averaging process data over the shift, Using interim readings as labels and Random splits across lots.

## Baseline and production design

- **Baseline (build this first):** Control charts on the key parameters with fixed limits, because engineers use them and the model should add value beyond them.
- **Production design:** Gradient boosting on aligned process features with monotonic constraints where physics is known, calibrated probabilities, and SHAP-style reasons shown beside the lot in the MES screen.

## Why AI, and why this kind

**Why AI.** Predict a lot or part's final quality result from process parameters while it is still being made so engineers can adjust or divert before value is added. The evidence that separates good from bad outcomes (Parameter deviation from the recipe, Dwell and cycle time, Material lot properties) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "interim readings" are what teams reach for first, and they fail because interim values are not the customer's requirement. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on aligned process features with monotonic constraints where physics is known, calibrated probabilities, and SHAP-style reasons shown beside the lot in the MES screen.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Parameter deviation from the recipe, Dwell and cycle time, Material lot properties and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Control charts on the key parameters with fixed limits, because engineers use them and the model should add value beyond them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on aligned process features with monotonic constraints where physics is known, calibrated probabilities, and SHAP-style reasons shown beside the lot in the MES screen | chosen | Meets the 2500 ms envelope at $0.015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Scrap and rework rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Averaging process data over the shift.
- Evaluation trap: Using interim readings as labels.
- New recipe: no examples for the new settings.
- Sensor drift: a calibrated sensor slowly shifts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
