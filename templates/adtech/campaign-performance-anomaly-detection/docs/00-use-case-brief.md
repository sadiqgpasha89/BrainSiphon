# Campaign Performance Anomaly Detection: use-case brief

> Generated from the blueprint `adtech/campaign-performance-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Campaign Performance Anomaly Detection · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect sudden changes in spend, CPA, CTR or delivery per campaign within minutes and alert owners with probable causes. The system has to run in under 100 milliseconds, inside these limits: Hundreds of thousands of campaigns, Seasonality and Low noise alerts.

**Why it is hard.** The obvious approach is static thresholds, and it fails because hourly cycles trigger constant false alarms. The second trap is in "Prioritisation": the real signal is rank by money at risk, while teams usually reach for rank by z-score.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.6K a month. A mistake is expensive in the way wasted spend before action measures it.

**What success looks like.** Offline: Detection delay at fixed false alarms and Precision of top alerts. Online: Mean time to detect and Wasted spend before action. The launch is judged on "Mean time to detect" while "Wasted spend before action" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect sudden changes in spend, CPA, CTR or delivery per campaign within minutes and alert owners with probable causes.

**Training objective.** `\mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(y_t-\mu_t)^2}{2\sigma_t^2}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \sigma_t | Standard deviation: the model's predicted spread, or uncertainty, around its mean prediction. (one value per time step or token t) |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mu_t | The model's predicted mean (expected value) of the outcome. (one value per time step or token t) |

**Hard constraints**

- Hundreds of thousands of campaigns
- Seasonality
- Low noise alerts
- Root-cause hints

## The approach in one paragraph

Start with daily threshold alerts on CPA. Then earn the move to hierarchical seasonal models with robust residuals, change-event correlation and money-at-risk ranking, and only if it beats the baseline on Detection delay at fixed false alarms and Precision of top alerts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Seasonal residual | Residual vs expected for hour and weekday. Anomaly. Guard against: forecast. |
| Add Spend at risk | Residual times spend rate. Priority. Guard against: spend rate. |
| Add Change events | Budget, bid or creative edits. Cause. Guard against: audit log. |
| Run it as one pipeline | Metrics stream (Kafka), Seasonal baseline (per-campaign), Residual scorer (robust stats), Cause linker (audit-log join), Alert ranker (spend-at-risk) and Account manager (human), with Alert feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle platform reporting delays | Data-freshness checks per source. |

**Deliberately not doing**

- Campaign name: none.
- Advertiser industry: weak.

**How the approach is proven**

Prove it offline on Detection delay at fixed false alarms and Precision of top alerts using time-ordered splits, then online on "Mean time to detect" with "Wasted spend before action" as the guardrail. Watch for: Synthetic anomaly tests only and Ignoring reporting delays.

## Baseline and production design

- **Baseline (build this first):** Daily threshold alerts on CPA.
- **Production design:** Hierarchical seasonal models with robust residuals, change-event correlation and money-at-risk ranking.

## Why AI, and why this kind

**Why AI.** Detect sudden changes in spend, CPA, CTR or delivery per campaign within minutes and alert owners with probable causes. The evidence that separates good from bad outcomes (Seasonal residual, Spend at risk, Change events) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static thresholds" are what teams reach for first, and they fail because hourly cycles trigger constant false alarms. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Hierarchical seasonal models with robust residuals, change-event correlation and money-at-risk ranking.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Seasonal residual, Spend at risk, Change events and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Daily threshold alerts on CPA | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical seasonal models with robust residuals, change-event correlation and money-at-risk ranking | chosen | Meets the 80 ms envelope at $0.040 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to detect) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Synthetic anomaly tests only.
- Evaluation trap: Ignoring reporting delays.
- Platform reporting delays: spend appears to drop.
- Intentional campaign changes: expected jumps flagged.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
