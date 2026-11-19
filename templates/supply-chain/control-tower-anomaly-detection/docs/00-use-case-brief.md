# Supply-Chain Control Tower Anomaly Detection: use-case brief

> Generated from the blueprint `supply-chain/control-tower-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supply-Chain Control Tower Anomaly Detection · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal events across orders, shipments and inventory in real time and prioritise by business impact. The system has to run in under 100 milliseconds, inside these limits: Millions of entities, Alert dedup and Impact ranking.

**Why it is hard.** The obvious approach is rank by statistical score, and it fails because statistical outliers may not matter. The second trap is in "Dedup": the real signal is group related alerts into incidents, while teams usually reach for one alert per entity.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.6K a month. A mistake is expensive in the way revenue protected measures it.

**What success looks like.** Offline: Precision at top alerts by impact and Incident clustering purity. Online: Time to detect disruptions and Revenue protected. The launch is judged on "Time to detect disruptions" while "Revenue protected" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal events across orders, shipments and inventory in real time and prioritise by business impact.

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

- Millions of entities
- Alert dedup
- Impact ranking
- Self-serve rules for planners

## The approach in one paragraph

Start with static threshold alerts on late milestones. Then earn the move to streaming expected-state models per entity class, graph-based impact propagation and incident clustering, and only if it beats the baseline on Precision at top alerts by impact and Incident clustering purity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Residual to expected milestone time | Actual minus predicted. Delay. Guard against: predictor. |
| Add Revenue-at-risk | Value of downstream orders affected. Priority. Guard against: graph join. |
| Add Alert correlation cluster | Shared cause across entities. Root cause. Guard against: clustering. |
| Run it as one pipeline | Event stream (Kafka), Expected-state models (per-entity), Anomaly scorer (residual statistics), Impact propagator (graph), Incident clusterer (similarity) and Resolution outcomes (labels), with Control-tower analyst off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle upstream outage causes thousands of simultaneous anomalies | Correlation clustering and incident mode. |

**Deliberately not doing**

- Entity ID: none.
- Alert text: none.

**How the approach is proven**

Prove it offline on Precision at top alerts by impact and Incident clustering purity using time-ordered splits, then online on "Time to detect disruptions" with "Revenue protected" as the guardrail. Watch for: Labels from alerts people acted upon and No evaluation on correlated bursts.

## Baseline and production design

- **Baseline (build this first):** Static threshold alerts on late milestones.
- **Production design:** Streaming expected-state models per entity class, graph-based impact propagation and incident clustering.

## Why AI, and why this kind

**Why AI.** Detect abnormal events across orders, shipments and inventory in real time and prioritise by business impact. The evidence that separates good from bad outcomes (Residual to expected milestone time, Revenue-at-risk, Alert correlation cluster) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "rank by statistical score" are what teams reach for first, and they fail because statistical outliers may not matter. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Streaming expected-state models per entity class, graph-based impact propagation and incident clustering.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Residual to expected milestone time, Revenue-at-risk, Alert correlation cluster and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static threshold alerts on late milestones | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming expected-state models per entity class, graph-based impact propagation and incident clustering | chosen | Meets the 80 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to detect disruptions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from alerts people acted upon.
- Evaluation trap: No evaluation on correlated bursts.
- Upstream outage causes thousands of simultaneous anomalies: one upstream outage triggers thousands of correlated alerts that bury the root cause.
- Milestone data missing from a partner: a partner stops sending milestones so shipments look late when they are simply unreported.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
