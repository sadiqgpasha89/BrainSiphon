# Scrap and Rework Prediction: use-case brief

> Generated from the blueprint `manufacturing/scrap-rework-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Scrap and Rework Prediction · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which parts or lots will be scrapped or reworked from upstream data so engineers can intervene early and plan rework capacity. The system has to run interactively, within a few seconds, inside these limits: Predictions available before the costly operation, Reasons shown to engineers and Retrain monthly.

**Why it is hard.** The obvious approach is any later delay, and it fails because delays have many causes. The second trap is in "Cost": the real signal is predictions weighted by the cost of the operation, while teams usually reach for equal weights.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $4.7K a month. A mistake is expensive in the way rework hours measures it.

**What success looks like.** Offline: Cost-weighted recall at fixed review capacity, Calibration and Lead time before the costly step. Online: Scrap cost, Rework hours and Parts diverted early. The launch is judged on "Scrap cost" while "Rework hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which parts or lots will be scrapped or reworked from upstream data so engineers can intervene early and plan rework capacity.

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

- Predictions available before the costly operation
- Reasons shown to engineers
- Retrain monthly
- 300K parts per day

## The approach in one paragraph

Start with historical scrap rate by product and machine, because it sets the minimum to beat. Then earn the move to gradient boosting on part-level upstream features with cost-weighted thresholds and reason codes, plus a rework capacity forecast, and only if it beats the baseline on Cost-weighted recall at fixed review capacity and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Upstream measurement deviations | Out-of-tolerance flags on earlier operations. Defect precursors. Guard against: by part id. |
| Add Tool life and changeover count | Parts since last tool change. Wear. Guard against: from the machine. |
| Add Material lot properties | Incoming test values. Variation. Guard against: by lot. |
| Run it as one pipeline | Part data and genealogy (MES), Feature build (per-part aggregates), Scrap model (gradient boosting), Cost-weighted threshold (rules), Reason display (station HMI), Rework planning (planning tool) and Outcome labels (nightly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new product | Product family priors and conservative thresholds. |

**Deliberately not doing**

- Operator name: not a cause.
- Part serial: an identifier.
- Shift label alone: confounded.

**How the approach is proven**

Prove it offline on Cost-weighted recall at fixed review capacity, Calibration and Lead time before the costly step using time-ordered splits, then online on "Scrap cost" with "Rework hours" as the guardrail. Watch for: Using final measurements, Equal cost weights and Ignoring unrecorded rework.

## Baseline and production design

- **Baseline (build this first):** Historical scrap rate by product and machine, because it sets the minimum to beat.
- **Production design:** Gradient boosting on part-level upstream features with cost-weighted thresholds and reason codes, plus a rework capacity forecast.

## Why AI, and why this kind

**Why AI.** Predict which parts or lots will be scrapped or reworked from upstream data so engineers can intervene early and plan rework capacity. The evidence that separates good from bad outcomes (Upstream measurement deviations, Tool life and changeover count, Material lot properties) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any later delay" are what teams reach for first, and they fail because delays have many causes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on part-level upstream features with cost-weighted thresholds and reason codes, plus a rework capacity forecast.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Upstream measurement deviations, Tool life and changeover count, Material lot properties and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Historical scrap rate by product and machine, because it sets the minimum to beat | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on part-level upstream features with cost-weighted thresholds and reason codes, plus a rework capacity forecast | chosen | Meets the 2500 ms envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Scrap cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using final measurements.
- Evaluation trap: Equal cost weights.
- New product: no scrap history.
- Inspection change: the labels shift after the change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
