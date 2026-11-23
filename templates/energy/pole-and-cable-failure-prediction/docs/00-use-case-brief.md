# Pole and Cable Failure Prediction: use-case brief

> Generated from the blueprint `energy/pole-and-cable-failure-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pole and Cable Failure Prediction · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict failures of wood poles and underground cables from age, material, soil, loading and test results so inspections and renewals go where failures are likely. The system has to run as a scheduled batch job, inside these limits: Failure probability per segment for the next year, Inspection list within a fixed budget and Explanations on request.

**Why it is hard.** The obvious approach is replacement records, and it fails because replacements happen for many reasons. The second trap is in "Censoring": the real signal is assets still alive are right-censored, while teams usually reach for only failed assets.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.7K a month. A mistake is expensive in the way inspection hit rate measures it.

**What success looks like.** Offline: Calibration of annual failure probability, Concordance and Top-decile capture rate. Online: In-service failures, Inspection hit rate and Renewal cost per avoided failure. The launch is judged on "In-service failures" while "Inspection hit rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict failures of wood poles and underground cables from age, material, soil, loading and test results so inspections and renewals go where failures are likely.

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

- Failure probability per segment for the next year
- Inspection list within a fixed budget
- Explanations on request
- Annual refresh for 10M poles and cable segments

## The approach in one paragraph

Start with replace by age beyond the design life, because it is a common policy. Then earn the move to a survival model handling censoring with gradient boosting for non-linear effects, calibrated probabilities and an inspection budget optimiser, and only if it beats the baseline on Calibration of annual failure probability and Concordance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Age and material | Age, species or insulation type. Baseline hazard. Guard against: from the register. |
| Add Soil and moisture | Soil class and moisture. Decay risk. Guard against: from geospatial data. |
| Add Loading and fault history | Load level and faults. Stress. Guard against: from SCADA. |
| Run it as one pipeline | Asset and test data extraction (asset system), Cohort and censoring setup (survival data prep), Hazard model (survival analysis), Calibration (isotonic fit), Inspection list (budget optimiser), Crew assignment (work management) and Outcome tracking (annual). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing install date | Age estimation with a flag. |

**Deliberately not doing**

- Pole number: an identifier.
- Crew name: irrelevant.
- Photo file name: an artefact.

**How the approach is proven**

Prove it offline on Calibration of annual failure probability, Concordance and Top-decile capture rate using time-ordered splits, then online on "In-service failures" with "Inspection hit rate" as the guardrail. Watch for: Ignoring censoring, Training on failures only and Replacement as the label.

## Baseline and production design

- **Baseline (build this first):** Replace by age beyond the design life, because it is a common policy.
- **Production design:** A survival model handling censoring with gradient boosting for non-linear effects, calibrated probabilities and an inspection budget optimiser.

## Why AI, and why this kind

**Why AI.** Predict failures of wood poles and underground cables from age, material, soil, loading and test results so inspections and renewals go where failures are likely. The evidence that separates good from bad outcomes (Age and material, Soil and moisture, Loading and fault history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "replacement records" are what teams reach for first, and they fail because replacements happen for many reasons. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A survival model handling censoring with gradient boosting for non-linear effects, calibrated probabilities and an inspection budget optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Age and material, Soil and moisture, Loading and fault history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Replace by age beyond the design life, because it is a common policy | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A survival model handling censoring with gradient boosting for non-linear effects, calibrated probabilities and an inspection budget optimiser | chosen | Meets the run-window envelope at $0.062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (In-service failures) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ignoring censoring.
- Evaluation trap: Training on failures only.
- Missing install date: the installation age is unknown.
- New material: no failures yet.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
