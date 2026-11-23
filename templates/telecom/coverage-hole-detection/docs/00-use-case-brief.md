# Coverage Hole Detection from Crowd Measurements: use-case brief

> Generated from the blueprint `telecom/coverage-hole-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Coverage Hole Detection from Crowd Measurements · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find locations with weak or absent coverage from anonymised device measurements and drive-test data, so planning targets the areas that users actually struggle in. The system has to run as a scheduled batch job, inside these limits: Device measurements aggregated and k-anonymised before analysis, No individual subscriber location history stored and Grid resolution of 50 m in dense areas.

**Why it is hard.** The obvious approach is raw sample counts, and it fails because samples cluster where people stand not where they need coverage. The second trap is in "Context": the real signal is indoor versus outdoor and device type, while teams usually reach for pooled signal strength.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way coverage complaints per area measures it.

**What success looks like.** Offline: Agreement with drive-test confirmation, Calibration of the weak-signal share and Spatial AUC held out by region. Online: Planned sites placed in confirmed holes, Coverage complaints per area and Drive-test cost. The launch is judged on "Planned sites placed in confirmed holes" while "Coverage complaints per area" must not get worse.

## Objective, loss and constraints

**Business objective.** Find locations with weak or absent coverage from anonymised device measurements and drive-test data, so planning targets the areas that users actually struggle in.

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

- Device measurements aggregated and k-anonymised before analysis
- No individual subscriber location history stored
- Grid resolution of 50 m in dense areas
- Weekly refresh for all regions

## The approach in one paragraph

Start with a map of signal strength percentiles from drive tests and sampled measurements, because planners already use it. Then earn the move to a spatial model that estimates a coverage experience score per tile from aggregated crowd data and propagation features, with a ranked list of hole clusters and a suggested class of fix, and only if it beats the baseline on Agreement with drive-test confirmation and Calibration of the weak-signal share after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Weak-signal share | Share of measurements below the coverage threshold per grid. Primary hole signal. Guard against: needs enough samples per tile. |
| Add Call setup failure and drop rate | Failure rate for sessions in the tile. Experience evidence. Guard against: attribute to coverage not core faults. |
| Add Distance to nearest serving site | Metres to the closest site. Explains the cause. Guard against: from site inventory. |
| Run it as one pipeline | Measurement aggregation (privacy-preserving batch), Grid build (geospatial index), Propagation and clutter features (geospatial join), Coverage score model (gradient boosting), Hole clustering (spatial clustering), Planning list (planning tool) and Validation drive test (field verification). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sparse area | Report unknown not good and schedule a drive test. |

**Deliberately not doing**

- Individual device identifiers: privacy risk and no gain.
- Handset brand alone: confounded with price.
- Time of day alone: does not explain coverage.

**How the approach is proven**

Prove it offline on Agreement with drive-test confirmation, Calibration of the weak-signal share and Spatial AUC held out by region using time-ordered splits, then online on "Planned sites placed in confirmed holes" with "Coverage complaints per area" as the guardrail. Watch for: Treating sample counts as demand, Using individual traces and Random splits that leak neighbouring tiles.

## Baseline and production design

- **Baseline (build this first):** A map of signal strength percentiles from drive tests and sampled measurements, because planners already use it.
- **Production design:** A spatial model that estimates a coverage experience score per tile from aggregated crowd data and propagation features, with a ranked list of hole clusters and a suggested class of fix.

## Why AI, and why this kind

**Why AI.** Find locations with weak or absent coverage from anonymised device measurements and drive-test data, so planning targets the areas that users actually struggle in. The evidence that separates good from bad outcomes (Weak-signal share, Call setup failure and drop rate, Distance to nearest serving site) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw sample counts" are what teams reach for first, and they fail because samples cluster where people stand not where they need coverage. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A spatial model that estimates a coverage experience score per tile from aggregated crowd data and propagation features, with a ranked list of hole clusters and a suggested class of fix.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Weak-signal share, Call setup failure and drop rate, Distance to nearest serving site and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A map of signal strength percentiles from drive tests and sampled measurements, because planners already use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A spatial model that estimates a coverage experience score per tile from aggregated crowd data and propagation features, with a ranked list of hole clusters and a suggested class of fix | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Planned sites placed in confirmed holes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating sample counts as demand.
- Evaluation trap: Using individual traces.
- Sparse area: too few samples to score.
- New site switched on: old scores persist.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
