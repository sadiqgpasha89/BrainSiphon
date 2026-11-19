# ML Platform: Drift & Quality Monitoring: use-case brief

> Generated from the blueprint `saas/ml-platform-drift-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ML Platform: Drift & Quality Monitoring · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Give every deployed model automatic monitoring for data drift, prediction drift and performance with label delay awareness. The system has to run as a scheduled batch job, inside these limits: Thousands of models, Delayed or missing labels and Low-noise alerts.

**Why it is hard.** The obvious approach is wait for labels, and it fails because labels arrive weeks later. The second trap is in "Alerts": the real signal is importance-weighted drift (features that matter), while teams usually reach for drift on every feature.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way retrains triggered unnecessarily measures it.

**What success looks like.** Offline: Detection of injected drift and Correlation of estimated and realised performance. Online: Time to detect degradation and Retrains triggered unnecessarily. The launch is judged on "Time to detect degradation" while "Retrains triggered unnecessarily" must not get worse.

## Objective, loss and constraints

**Business objective.** Give every deployed model automatic monitoring for data drift, prediction drift and performance with label delay awareness.

**Training objective.** `\mathrm{PSI}=\sum_i(P_i-Q_i)\ln\frac{P_i}{Q_i}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathrm{PSI} | Population stability index: a measure of how much a feature's distribution has drifted from its reference. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| P_i | The reference distribution: P_i is the share in bin i at training time. |
| Q_i | The current distribution: Q_i is the share in bin i now. |
| \ln | Natural logarithm. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |

**Hard constraints**

- Thousands of models
- Delayed or missing labels
- Low-noise alerts
- Self-serve onboarding

## The approach in one paragraph

Start with manual dashboards for a few models. Then earn the move to platform-level monitors with importance-weighted drift, label-free performance estimation and alert policies per model tier, and only if it beats the baseline on Detection of injected drift and Correlation of estimated and realised performance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Importance-weighted PSI | PSI weighted by feature importance. Relevant drift. Guard against: importance estimates. |
| Add Prediction distribution shift | Score distribution change. Early warning. Guard against: reference window. |
| Add Delayed-label performance estimate | CBPE-style estimates. Performance. Guard against: calibration. |
| Run it as one pipeline | Inference logs (stream), Reference baselines (training stats), Drift and quality metrics (Spark), Label-free estimator (calibration), Alert policy (tiered thresholds), Model owner (human) and Retrain trigger (pipeline). |
| Optimise the right thing | The objective weighs population stability index: a measure of how much a feature's distribution has drifted from its reference, so the model is trained on the cost of the decision and not on a generic score. |
| Handle upstream schema change | Schema-change detection and grouped alerts. |

**Deliberately not doing**

- Drift in unused features: no impact.
- Single-day PSI: sampling noise.

**How the approach is proven**

Prove it offline on Detection of injected drift and Correlation of estimated and realised performance using time-ordered splits, then online on "Time to detect degradation" with "Retrains triggered unnecessarily" as the guardrail. Watch for: Drift without link to performance and Static reference windows.

## Baseline and production design

- **Baseline (build this first):** Manual dashboards for a few models.
- **Production design:** Platform-level monitors with importance-weighted drift, label-free performance estimation and alert policies per model tier.

## Why AI, and why this kind

**Why AI.** Give every deployed model automatic monitoring for data drift, prediction drift and performance with label delay awareness. The evidence that separates good from bad outcomes (Importance-weighted PSI, Prediction distribution shift, Delayed-label performance estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "wait for labels" are what teams reach for first, and they fail because labels arrive weeks later. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Platform-level monitors with importance-weighted drift, label-free performance estimation and alert policies per model tier.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Importance-weighted PSI, Prediction distribution shift, Delayed-label performance estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual dashboards for a few models | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Platform-level monitors with importance-weighted drift, label-free performance estimation and alert policies per model tier | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to detect degradation) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Drift without link to performance.
- Evaluation trap: Static reference windows.
- Upstream schema change: drift alerts for all features.
- Seasonal shift flagged as drift: unnecessary retrains.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
