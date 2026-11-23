# Building Fire Inspection Prioritisation: use-case brief

> Generated from the blueprint `public-safety/building-fire-inspection-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Building Fire Inspection Prioritisation · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank buildings for fire safety inspections by likelihood and consequence of fire from building data and past incidents so inspectors visit the highest-risk premises first. The system has to run as a scheduled batch job, inside these limits: Building-level risk with the drivers, Inspections by fire officers and Random visits kept to find model errors.

**Why it is hard.** The obvious approach is complaints, and it fails because complaints depend on who reports. The second trap is in "Level": the real signal is building and occupancy, while teams usually reach for occupant-level scoring.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way fires in inspected buildings measures it.

**What success looks like.** Offline: Incident violations found per inspection, Calibration and Detection parity across areas. Online: Serious violations found, Fires in inspected buildings and Time since last inspection of high-risk sites. The launch is judged on "Serious violations found" while "Fires in inspected buildings" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank buildings for fire safety inspections by likelihood and consequence of fire from building data and past incidents so inspectors visit the highest-risk premises first.

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

- Building-level risk with the drivers
- Inspections by fire officers
- Random visits kept to find model errors
- Fairness audited by area
- 150K buildings

## The approach in one paragraph

Start with inspection frequency set by occupancy class, because it is the regulatory baseline. Then earn the move to a calibrated risk model with consequence weighting, a reserved random sample and route planning for inspectors, with parity checks by area, and only if it beats the baseline on Incident violations found per inspection and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Building age and construction | Age, materials and height. Hazard. Guard against: from the register. |
| Add Occupancy type | Residential, commercial or assembly. Consequence. Guard against: from permits. |
| Add Past inspections and violations | Findings and time since last visit. Prior. Guard against: from inspections. |
| Run it as one pipeline | Building and inspection data (fire records), Incident feature build (aggregated history), Fire risk model (gradient boosting), Incident consequence weighting (rules), Inspection route plan (optimiser) and Incident inspector visit (field app), with Parity audit off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new building | Occupancy-based priors and a first-visit rule. |

**Deliberately not doing**

- Owner name: personal data.
- Neighbourhood name: a proxy.
- Inspector name: irrelevant.

**How the approach is proven**

Prove it offline on Incident violations found per inspection, Calibration and Detection parity across areas using time-ordered splits, then online on "Serious violations found" with "Fires in inspected buildings" as the guardrail. Watch for: Scoring occupants, Ranked-only sampling and Complaint-based labels.

## Baseline and production design

- **Baseline (build this first):** Inspection frequency set by occupancy class, because it is the regulatory baseline.
- **Production design:** A calibrated risk model with consequence weighting, a reserved random sample and route planning for inspectors, with parity checks by area.

## Why AI, and why this kind

**Why AI.** Rank buildings for fire safety inspections by likelihood and consequence of fire from building data and past incidents so inspectors visit the highest-risk premises first. The evidence that separates good from bad outcomes (Building age and construction, Occupancy type, Past inspections and violations) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "complaints" are what teams reach for first, and they fail because complaints depend on who reports. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated risk model with consequence weighting, a reserved random sample and route planning for inspectors, with parity checks by area.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Building age and construction, Occupancy type, Past inspections and violations and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Inspection frequency set by occupancy class, because it is the regulatory baseline | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated risk model with consequence weighting, a reserved random sample and route planning for inspectors, with parity checks by area | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Serious violations found) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Scoring occupants.
- Evaluation trap: Ranked-only sampling.
- New building: the building has no inspection history.
- Data gaps: the register lacks the construction type.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
