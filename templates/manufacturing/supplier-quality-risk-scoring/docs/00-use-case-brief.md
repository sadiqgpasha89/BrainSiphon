# Supplier Quality Risk Scoring: use-case brief

> Generated from the blueprint `manufacturing/supplier-quality-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supplier Quality Risk Scoring · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score incoming supplier lots and suppliers for quality risk so inspection effort goes to the risky ones and good suppliers flow through faster. The system has to run as a scheduled batch job, inside these limits: Skip-lot rules must satisfy the quality agreement, Scores explained to supplier quality engineers and Critical parts are never fully skipped.

**Why it is hard.** The obvious approach is late deliveries, and it fails because delivery issues are a separate problem. The second trap is in "History": the real signal is supplier and part-level history with recent weighting, while teams usually reach for supplier averages.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.8K a month. A mistake is expensive in the way line stops from incoming defects measures it.

**What success looks like.** Offline: Recall of failing lots at the inspection budget, Calibration and Escapes missed in skipped lots. Online: Inspection hours, Line stops from incoming defects and Skip-lot share. The launch is judged on "Inspection hours" while "Line stops from incoming defects" must not get worse.

## Objective, loss and constraints

**Business objective.** Score incoming supplier lots and suppliers for quality risk so inspection effort goes to the risky ones and good suppliers flow through faster.

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

- Skip-lot rules must satisfy the quality agreement
- Scores explained to supplier quality engineers
- Critical parts are never fully skipped
- Daily scoring for 500K inbound lots

## The approach in one paragraph

Start with fixed inspection levels by part criticality and supplier rating, because it follows the quality plan. Then earn the move to gradient boosting on part, supplier and lot features with calibrated risk, mapped to inspection levels with guard rules, plus a supplier scorecard view, and only if it beats the baseline on Recall of failing lots at the inspection budget and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Recent failure rate | Failures in the last 10 lots for the part and supplier. Strong predictor. Guard against: exclude the lot being scored. |
| Add Supplier change events | Tooling, site or process changes at the supplier. Risk driver. Guard against: from supplier notices. |
| Add Certificate and audit status | Audit score and age of certificates. Compliance signal. Guard against: from the supplier system. |
| Run it as one pipeline | Receipt and inspection data (ERP and QMS), Supplier feature build (lakehouse), Risk model (gradient boosting), Inspection level mapping (rules with guard bands), Receiving instruction (warehouse system), Result capture (QMS) and Retrain (monthly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new supplier | Start at full inspection and relax with evidence. |

**Deliberately not doing**

- Supplier name: an identifier.
- Purchase order number: an identifier.
- Buyer name: irrelevant.

**How the approach is proven**

Prove it offline on Recall of failing lots at the inspection budget, Calibration and Escapes missed in skipped lots using time-ordered splits, then online on "Inspection hours" with "Line stops from incoming defects" as the guardrail. Watch for: Using supplier averages only, Skipping critical parts and Treating late delivery as quality.

## Baseline and production design

- **Baseline (build this first):** Fixed inspection levels by part criticality and supplier rating, because it follows the quality plan.
- **Production design:** Gradient boosting on part, supplier and lot features with calibrated risk, mapped to inspection levels with guard rules, plus a supplier scorecard view.

## Why AI, and why this kind

**Why AI.** Score incoming supplier lots and suppliers for quality risk so inspection effort goes to the risky ones and good suppliers flow through faster. The evidence that separates good from bad outcomes (Recent failure rate, Supplier change events, Certificate and audit status) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "late deliveries" are what teams reach for first, and they fail because delivery issues are a separate problem. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on part, supplier and lot features with calibrated risk, mapped to inspection levels with guard rules, plus a supplier scorecard view.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Recent failure rate, Supplier change events, Certificate and audit status and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed inspection levels by part criticality and supplier rating, because it follows the quality plan | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on part, supplier and lot features with calibrated risk, mapped to inspection levels with guard rules, plus a supplier scorecard view | chosen | Meets the run-window envelope at $0.039 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Inspection hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using supplier averages only.
- Evaluation trap: Skipping critical parts.
- New supplier: the supplier has no history.
- Single-source part: the supplier cannot be switched.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
