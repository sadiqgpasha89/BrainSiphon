# AIOps Incident Detection: use-case brief

> Generated from the blueprint `saas/aiops-incident-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AIOps Incident Detection · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect production incidents from metrics, traces and logs within minutes, with low alert noise and clear scope. The system has to run in under 100 milliseconds, inside these limits: Millions of time series, Seasonality and Alert budget per team.

**Why it is hard.** The obvious approach is alert on every anomaly, and it fails because most anomalies don't affect users. The second trap is in "Seasonality": the real signal is seasonal forecasting baselines, while teams usually reach for static thresholds.

**Scale and stakes.** At 10 million users this is about 3000.0M model-touching events a day, 34.7K requests per second on average and 208.3K at peak, at an estimated $86.5K a month. A mistake is expensive in the way pages per incident measures it.

**What success looks like.** Offline: Detection delay at fixed false alerts and Precision on postmortem-confirmed incidents. Online: Mean time to detect and Pages per incident. The launch is judged on "Mean time to detect" while "Pages per incident" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect production incidents from metrics, traces and logs within minutes, with low alert noise and clear scope.

**Training objective.** `\mathcal{L}=\sum_t\left[\log\hat\sigma_t+\frac{(y_t-\hat\mu_t)^2}{2\hat\sigma_t^2}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{\sigma}_t | The model's estimated standard deviation (uncertainty). (one value per time step or token t) |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{\mu}_t | The model's estimated mean (expected value) of the outcome. (one value per time step or token t) |

**Hard constraints**

- Millions of time series
- Seasonality
- Alert budget per team
- Explainable alerts

## The approach in one paragraph

Start with static threshold alerts on CPU and latency. Then earn the move to multi-window SLO burn alerts plus seasonal anomaly detectors on key SLIs, correlated with change events, and only if it beats the baseline on Detection delay at fixed false alerts and Precision on postmortem-confirmed incidents after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around SLI burn rate | Error budget burn over multiple windows. User impact. Guard against: window choices. |
| Add Seasonal residual | Residual vs forecast. Anomaly. Guard against: forecast quality. |
| Add Deploy and change events | Recent deployments. Cause. Guard against: event feed. |
| Run it as one pipeline | Metrics stream (Prometheus and Kafka), Baseline forecaster (seasonal), Anomaly scorer (residual stats), SLO burn evaluator (multi-window), Change correlation (deploy feed), On-call page (alerting) and Incident labels (postmortems). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle traffic from a marketing campaign | Campaign calendar covariates. |

**Deliberately not doing**

- Single-sample spikes: noise.
- Host name: none.

**How the approach is proven**

Prove it offline on Detection delay at fixed false alerts and Precision on postmortem-confirmed incidents using time-ordered splits, then online on "Mean time to detect" with "Pages per incident" as the guardrail. Watch for: Synthetic anomalies only and Labels from alerts that fired.

## Baseline and production design

- **Baseline (build this first):** Static threshold alerts on CPU and latency.
- **Production design:** Multi-window SLO burn alerts plus seasonal anomaly detectors on key SLIs, correlated with change events.

## Why AI, and why this kind

**Why AI.** Detect production incidents from metrics, traces and logs within minutes, with low alert noise and clear scope. The evidence that separates good from bad outcomes (SLI burn rate, Seasonal residual, Deploy and change events) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "alert on every anomaly" are what teams reach for first, and they fail because most anomalies don't affect users. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Multi-window SLO burn alerts plus seasonal anomaly detectors on key SLIs, correlated with change events.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among SLI burn rate, Seasonal residual, Deploy and change events and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static threshold alerts on CPU and latency | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-window SLO burn alerts plus seasonal anomaly detectors on key SLIs, correlated with change events | chosen | Meets the 80 ms envelope at $0.00096 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to detect) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Synthetic anomalies only.
- Evaluation trap: Labels from alerts that fired.
- Traffic from a marketing campaign: anomaly alerts for expected load.
- Metric cardinality explosion: detectors overloaded.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
