# Geotechnical Ground Risk Modelling: use-case brief

> Generated from the blueprint `engineering/geotechnical-ground-risk-modelling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Geotechnical Ground Risk Modelling · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Combine borehole logs, geophysics and past projects to map ground conditions and uncertainty and flag areas where unexpected conditions could hit cost and schedule. The system has to run as a scheduled batch job, inside these limits: Maps show uncertainty, Geotechnical engineers review all outputs and Gaps in data highlighted.

**Why it is hard.** The obvious approach is a single ground model, and it fails because uncertainty drives risk. The second trap is in "Data": the real signal is quality-rated investigation data, while teams usually reach for all logs equally.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way investigation cost measures it.

**What success looks like.** Offline: Prediction error at held-out boreholes, Uncertainty calibration and Engineer acceptance. Online: Unexpected ground conditions, Investigation cost and Cost growth from ground issues. The launch is judged on "Unexpected ground conditions" while "Investigation cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Combine borehole logs, geophysics and past projects to map ground conditions and uncertainty and flag areas where unexpected conditions could hit cost and schedule.

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

- Maps show uncertainty
- Geotechnical engineers review all outputs
- Gaps in data highlighted
- Additional investigation recommended where uncertainty is high
- 10K boreholes

## The approach in one paragraph

Start with engineers interpolating by hand between boreholes, because it is the usual practice. Then earn the move to a geostatistical and learned model that produces ground maps with uncertainty and highlights where extra investigation would reduce risk most, and only if it beats the baseline on Prediction error at held-out boreholes and Uncertainty calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Borehole logs | Soil and rock descriptions. Core. Guard against: from investigations. |
| Add Geophysical profiles | Resistivity and seismic data. Core. Guard against: from surveys. |
| Add Distance to nearest data | Data density. Uncertainty. Guard against: from geometry. |
| Run it as one pipeline | Data collection (geotechnical database), Quality rating (rules), Spatial model (geostatistics and ML), Uncertainty map (analytics), Investigation plan (project tool) and Update with new data (weekly), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sparse data | Wide uncertainty. |

**Deliberately not doing**

- Driller name: personal data.
- Log format: an artefact.
- Contractor brand: weak link.

**How the approach is proven**

Prove it offline on Prediction error at held-out boreholes, Uncertainty calibration and Engineer acceptance using time-ordered splits, then online on "Unexpected ground conditions" with "Investigation cost" as the guardrail. Watch for: Single ground models, Equal weight for all logs and Replacing site investigation.

## Baseline and production design

- **Baseline (build this first):** Engineers interpolating by hand between boreholes, because it is the usual practice.
- **Production design:** A geostatistical and learned model that produces ground maps with uncertainty and highlights where extra investigation would reduce risk most.

## Why AI, and why this kind

**Why AI.** Combine borehole logs, geophysics and past projects to map ground conditions and uncertainty and flag areas where unexpected conditions could hit cost and schedule. The evidence that separates good from bad outcomes (Borehole logs, Geophysical profiles, Distance to nearest data) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A single ground model" are what teams reach for first, and they fail because uncertainty drives risk. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A geostatistical and learned model that produces ground maps with uncertainty and highlights where extra investigation would reduce risk most.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Borehole logs, Geophysical profiles, Distance to nearest data and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Engineers interpolating by hand between boreholes, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A geostatistical and learned model that produces ground maps with uncertainty and highlights where extra investigation would reduce risk most | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unexpected ground conditions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Single ground models.
- Evaluation trap: Equal weight for all logs.
- Sparse data: few boreholes exist.
- Sharp geological boundary: ground changes abruptly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
