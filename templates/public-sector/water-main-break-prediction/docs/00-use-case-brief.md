# Water Main Break Prediction: use-case brief

> Generated from the blueprint `public-sector/water-main-break-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Water Main Break Prediction · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which pipes are likely to break so renewal and pressure management target the pipes with the highest risk and consequence. The system has to run as a scheduled batch job, inside these limits: Break probability per pipe for the next year, Consequence weighting by customers and critical sites and Engineers review renewal lists.

**Why it is hard.** The obvious approach is complaints, and it fails because complaints do not locate breaks. The second trap is in "Censoring": the real signal is pipes that have not failed are censored, while teams usually reach for failed pipes only.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.7K a month. A mistake is expensive in the way renewal cost per avoided break measures it.

**What success looks like.** Offline: Calibration of annual break probability, Concordance and Top-decile capture. Online: Breaks per 100 km, Renewal cost per avoided break and Customer minutes lost. The launch is judged on "Breaks per 100 km" while "Renewal cost per avoided break" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which pipes are likely to break so renewal and pressure management target the pipes with the highest risk and consequence.

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

- Break probability per pipe for the next year
- Consequence weighting by customers and critical sites
- Engineers review renewal lists
- Annual refresh for 2M pipes

## The approach in one paragraph

Start with replace the oldest cast iron pipes first, because it is a common policy. Then earn the move to a survival model with spatial features and consequence weighting, a budget-constrained renewal planner and a pressure management advisor, and only if it beats the baseline on Calibration of annual break probability and Concordance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pipe material and age | Material, diameter and install year. Baseline hazard. Guard against: from the register. |
| Add Break history | Past breaks on the pipe and neighbours. Strong predictor. Guard against: from records. |
| Add Soil and traffic load | Corrosive soil and road loading. Stress. Guard against: from geospatial data. |
| Run it as one pipeline | Asset and break data extraction (asset system), Survival data setup (batch), Hazard model (survival analysis), Consequence weighting (GIS rules), Renewal optimiser (budget model) and Outcome tracking (annual), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing install year | Age estimation with a flag. |

**Deliberately not doing**

- Pipe id: an identifier.
- Contractor name: irrelevant.
- Map layer: an artefact.

**How the approach is proven**

Prove it offline on Calibration of annual break probability, Concordance and Top-decile capture using time-ordered splits, then online on "Breaks per 100 km" with "Renewal cost per avoided break" as the guardrail. Watch for: Age-only replacement, Training on failures only and Ignoring consequence.

## Baseline and production design

- **Baseline (build this first):** Replace the oldest cast iron pipes first, because it is a common policy.
- **Production design:** A survival model with spatial features and consequence weighting, a budget-constrained renewal planner and a pressure management advisor.

## Why AI, and why this kind

**Why AI.** Predict which pipes are likely to break so renewal and pressure management target the pipes with the highest risk and consequence. The evidence that separates good from bad outcomes (Pipe material and age, Break history, Soil and traffic load) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "complaints" are what teams reach for first, and they fail because complaints do not locate breaks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A survival model with spatial features and consequence weighting, a budget-constrained renewal planner and a pressure management advisor.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pipe material and age, Break history, Soil and traffic load and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Replace the oldest cast iron pipes first, because it is a common policy | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A survival model with spatial features and consequence weighting, a budget-constrained renewal planner and a pressure management advisor | chosen | Meets the run-window envelope at $0.062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Breaks per 100 km) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Age-only replacement.
- Evaluation trap: Training on failures only.
- Missing install year: the pipe age is unknown.
- Repair bias: breaks near depots are recorded more.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
