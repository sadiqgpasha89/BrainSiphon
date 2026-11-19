# Logistics Carbon Footprint Estimation: use-case brief

> Generated from the blueprint `supply-chain/carbon-footprint-estimation-logistics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Logistics Carbon Footprint Estimation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate emissions per shipment, lane and product to report accurately and steer decisions toward lower-carbon options. The system has to run as a scheduled batch job, inside these limits: GLEC / ISO 14083 compliance, Primary vs modelled data transparency and Audit trail.

**Why it is hard.** The obvious approach is default emission factors everywhere, and it fails because defaults miss load factor and route effects. The second trap is in "Allocation": the real signal is allocate by weight-distance with load factor, while teams usually reach for equal per shipment.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way reduction from lane decisions measures it.

**What success looks like.** Offline: Error vs metered fuel data and Coverage of primary data. Online: Verified emissions coverage and Reduction from lane decisions. The launch is judged on "Verified emissions coverage" while "Reduction from lane decisions" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate emissions per shipment, lane and product to report accurately and steer decisions toward lower-carbon options.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(E,\hat E)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| E | The emissions of a shipment; the hat is the model's estimate. |
| \hat{E} | The model's predicted quantity E. |

**Hard constraints**

- GLEC / ISO 14083 compliance
- Primary vs modelled data transparency
- Audit trail
- Scope 3 reporting

## The approach in one paragraph

Start with default emission factors by mode times distance. Then earn the move to hybrid estimator using primary fuel data when available and ML-calibrated factors otherwise, with uncertainty and audit lineage, and only if it beats the baseline on Error vs metered fuel data and Coverage of primary data after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Load factor | Utilisation of vehicle capacity. Efficiency. Guard against: weight data. |
| Add Mode and vehicle class | Mode, fuel type, Euro class. Factor. Guard against: fleet data. |
| Add Actual vs planned distance | Distance driven. Accuracy. Guard against: telematics. |
| Run it as one pipeline | Shipment and telematics data (lake), Distance and load calculator (geospatial), Emission factor service (versioned factors), ML calibrator (GBDT) and Allocation engine (rules), with Sustainability reviewer and Report generator off the critical path. |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing primary data for subcontracted legs | Data-quality tiers displayed with estimates. |

**Deliberately not doing**

- Shipment ID: none.
- Customer name: none.

**How the approach is proven**

Prove it offline on Error vs metered fuel data and Coverage of primary data using time-ordered splits, then online on "Verified emissions coverage" with "Reduction from lane decisions" as the guardrail. Watch for: Validated only on own fleet and Ignoring empty running.

## Baseline and production design

- **Baseline (build this first):** Default emission factors by mode times distance.
- **Production design:** Hybrid estimator using primary fuel data when available and ML-calibrated factors otherwise, with uncertainty and audit lineage.

## Why AI, and why this kind

**Why AI.** Estimate emissions per shipment, lane and product to report accurately and steer decisions toward lower-carbon options. The evidence that separates good from bad outcomes (Load factor, Mode and vehicle class, Actual vs planned distance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "default emission factors everywhere" are what teams reach for first, and they fail because defaults miss load factor and route effects. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Hybrid estimator using primary fuel data when available and ML-calibrated factors otherwise, with uncertainty and audit lineage.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Load factor, Mode and vehicle class, Actual vs planned distance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Default emission factors by mode times distance | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hybrid estimator using primary fuel data when available and ML-calibrated factors otherwise, with uncertainty and audit lineage | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Verified emissions coverage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Validated only on own fleet.
- Evaluation trap: Ignoring empty running.
- Missing primary data for subcontracted legs: defaults used silently.
- Emission factor update: restated history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
