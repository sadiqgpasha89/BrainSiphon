# Payments Operations Anomaly Detection: use-case brief

> Generated from the blueprint `fintech/payment-ops-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Payments Operations Anomaly Detection · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal drops in success rate, latency or volume across thousands of payment dimensions within minutes of onset. The system has to run in under 100 milliseconds, inside these limits: Alert latency under 3 minutes, 50k dimension combinations and False alerts under 1 per day per team.

**Why it is hard.** The obvious approach is monitoring only top-line success rate, and it fails because segment outages hide inside healthy aggregates. The second trap is in "Noise": the real signal is seasonality-adjusted residuals with adaptive thresholds, while teams usually reach for static thresholds.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.6K a month. A mistake is expensive in the way alert fatigue (pages per incident) measures it.

**What success looks like.** Offline: Detection delay at fixed false-alarm rate and Precision on postmortem-confirmed incidents. Online: Mean time to detect and Alert fatigue (pages per incident). The launch is judged on "Mean time to detect" while "Alert fatigue (pages per incident)" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal drops in success rate, latency or volume across thousands of payment dimensions within minutes of onset.

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

- Alert latency under 3 minutes
- 50k dimension combinations
- False alerts under 1 per day per team
- Root-cause hints

## The approach in one paragraph

Start with static thresholds on success rate. Then earn the move to seasonal forecasting per segment with Bayesian shrinkage, hierarchical reconciliation and Shapley-style drill-down for root cause, and only if it beats the baseline on Detection delay at fixed false-alarm rate and Precision on postmortem-confirmed incidents after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Success-rate residual z-score | Residual of success rate vs seasonal forecast. Anomaly measure. Guard against: forecast uses only past data. |
| Add Volume-weighted impact | Residual times affected volume. Prioritises business impact. Guard against: use rolling volume baseline. |
| Add Dimension co-movement | Which dimension values explain the drop. Root cause. Guard against: control for multiple comparisons. |
| Run it as one pipeline | Metrics stream (Kafka), Segment aggregator (Flink), Seasonal forecaster (Prophet-style plus shrinkage), Anomaly scorer (residual statistics), Alert deduplicator (incident grouping), On-call page (PagerDuty) and Incident labels (postmortem tags). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle planned maintenance window | Change-calendar suppression with automatic registration. |

**Deliberately not doing**

- Single-minute dips in tiny segments: statistical noise.
- Holiday raw volumes: predictable via calendar.

**How the approach is proven**

Prove it offline on Detection delay at fixed false-alarm rate and Precision on postmortem-confirmed incidents using time-ordered splits, then online on "Mean time to detect" with "Alert fatigue (pages per incident)" as the guardrail. Watch for: Synthetic injected anomalies unlike real outages and Training on periods containing undetected incidents.

## Baseline and production design

- **Baseline (build this first):** Static thresholds on success rate.
- **Production design:** Seasonal forecasting per segment with Bayesian shrinkage, hierarchical reconciliation and Shapley-style drill-down for root cause.

## Why AI, and why this kind

**Why AI.** Detect abnormal drops in success rate, latency or volume across thousands of payment dimensions within minutes of onset. The evidence that separates good from bad outcomes (Success-rate residual z-score, Volume-weighted impact, Dimension co-movement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "monitoring only top-line success rate" are what teams reach for first, and they fail because segment outages hide inside healthy aggregates. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Seasonal forecasting per segment with Bayesian shrinkage, hierarchical reconciliation and Shapley-style drill-down for root cause.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Success-rate residual z-score, Volume-weighted impact, Dimension co-movement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static thresholds on success rate | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Seasonal forecasting per segment with Bayesian shrinkage, hierarchical reconciliation and Shapley-style drill-down for root cause | chosen | Meets the 80 ms envelope at $0.040 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to detect) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Synthetic injected anomalies unlike real outages.
- Evaluation trap: Training on periods containing undetected incidents.
- Planned maintenance window: alerts fire for known downtime.
- New merchant launch: segment has no history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
