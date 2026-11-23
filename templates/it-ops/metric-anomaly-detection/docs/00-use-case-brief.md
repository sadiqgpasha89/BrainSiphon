# Metric Anomaly Detection: use-case brief

> Generated from the blueprint `it-ops/metric-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Metric Anomaly Detection · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal behaviour in service and infrastructure metrics against seasonal baselines and raise alerts that carry context, with fewer false alarms than static thresholds. The system has to run interactively, within a few seconds, inside these limits: Detection within 60 s of onset, False alert rate under 1 per service per week and Alerts show the baseline and deviation.

**Why it is hard.** The obvious approach is a fixed threshold, and it fails because load changes through the day and week. The second trap is in "Label": the real signal is incidents and confirmed anomalies, while teams usually reach for every alert fired.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $4.7K a month. A mistake is expensive in the way alert precision measures it.

**What success looks like.** Offline: Detection of seeded anomalies, False alert rate and Time to detect. Online: Incidents detected by anomaly, Alert precision and Customer-reported outages. The launch is judged on "Incidents detected by anomaly" while "Alert precision" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal behaviour in service and infrastructure metrics against seasonal baselines and raise alerts that carry context, with fewer false alarms than static thresholds.

**Training objective.** `\mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| x | The input features describing one example (what the model sees). |
| \mathrm{Dec} | The decoder: the network part that rebuilds the input from its compressed code. |
| \mathrm{Enc} | The encoder: the network part that compresses the input into a short code. |

**Hard constraints**

- Detection within 60 s of onset
- False alert rate under 1 per service per week
- Alerts show the baseline and deviation
- Owners tune sensitivity
- 5M metric series

## The approach in one paragraph

Start with static thresholds on key metrics, because they are the standard configuration. Then earn the move to a per-series detector with seasonal baselines, multi-metric confirmation and release awareness that publishes alerts with context to the alert pipeline, and only if it beats the baseline on Detection of seeded anomalies and False alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Deviation from seasonal baseline | Residual after seasonal fit. Core. Guard against: from time-series. |
| Add Rate of change | Slope over recent minutes. Core. Guard against: from metrics. |
| Add Related metric movement | Correlated metrics also moving. Confidence. Guard against: from the same service. |
| Run it as one pipeline | Metric ingestion (time-series database), Seasonal baseline fit (forecasting), Anomaly scoring (detector), Multi-metric confirmation (rules) and Alert with context (alert pipeline), with Owner feedback and Threshold review off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new metric | Use static limits until the baseline is ready. |

**Deliberately not doing**

- Host name: an identifier.
- Metric unit label: an artefact.
- Dashboard folder: irrelevant.

**How the approach is proven**

Prove it offline on Detection of seeded anomalies, False alert rate and Time to detect using time-ordered splits, then online on "Incidents detected by anomaly" with "Alert precision" as the guardrail. Watch for: Fixed thresholds only, Alert count as success and Ignoring release events.

## Baseline and production design

- **Baseline (build this first):** Static thresholds on key metrics, because they are the standard configuration.
- **Production design:** A per-series detector with seasonal baselines, multi-metric confirmation and release awareness that publishes alerts with context to the alert pipeline.

## Why AI, and why this kind

**Why AI.** Detect abnormal behaviour in service and infrastructure metrics against seasonal baselines and raise alerts that carry context, with fewer false alarms than static thresholds. The evidence that separates good from bad outcomes (Deviation from seasonal baseline, Rate of change, Related metric movement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A fixed threshold" are what teams reach for first, and they fail because load changes through the day and week. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A per-series detector with seasonal baselines, multi-metric confirmation and release awareness that publishes alerts with context to the alert pipeline.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Deviation from seasonal baseline, Rate of change, Related metric movement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static thresholds on key metrics, because they are the standard configuration | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A per-series detector with seasonal baselines, multi-metric confirmation and release awareness that publishes alerts with context to the alert pipeline | chosen | Meets the 2500 ms envelope at $0.0053 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incidents detected by anomaly) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixed thresholds only.
- Evaluation trap: Alert count as success.
- New metric: too little history exists for a baseline.
- Planned event: a promotion or migration changes load.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
