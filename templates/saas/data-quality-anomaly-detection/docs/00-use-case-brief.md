# Data Quality Anomaly Detection: use-case brief

> Generated from the blueprint `saas/data-quality-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Data Quality Anomaly Detection · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect freshness, volume, schema and distribution problems in data pipelines before dashboards and models break. The system has to run as a scheduled batch job, inside these limits: Thousands of tables, Low alert noise and Lineage-aware impact.

**Why it is hard.** The obvious approach is alert on every anomaly, and it fails because most anomalies affect unused tables. The second trap is in "Baselines": the real signal is seasonal per-table baselines, while teams usually reach for static row-count thresholds.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way alert noise measures it.

**What success looks like.** Offline: Detection precision on incident-linked alerts and Detection delay. Online: Data incidents caught before consumers and Alert noise. The launch is judged on "Data incidents caught before consumers" while "Alert noise" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect freshness, volume, schema and distribution problems in data pipelines before dashboards and models break.

**Training objective.** `\mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(m_t-\mu_t)^2}{2\sigma_t^2}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \sigma_t | The predicted normal spread of the metric. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| m_t | The data quality metric at time t, such as row count or null rate. |
| \mu_t | The predicted normal value of the metric. |

**Hard constraints**

- Thousands of tables
- Low alert noise
- Lineage-aware impact
- Auto-generated checks

## The approach in one paragraph

Start with hand-written SQL checks per table. Then earn the move to auto-profiled metrics with seasonal baselines, lineage-based impact ranking and LLM-assisted root-cause hints, and only if it beats the baseline on Detection precision on incident-linked alerts and Detection delay after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Freshness delay vs expected | Time since last load vs schedule. Staleness. Guard against: schedule metadata. |
| Add Volume and null-rate deviation | Z-score. Data issue. Guard against: baseline. |
| Add Downstream consumer count | Lineage fan-out. Priority. Guard against: lineage graph. |
| Run it as one pipeline | Metric profiler (batch), Seasonal anomaly detector (stats), Lineage impact ranker (graph), Alert router (data owners) and Data engineer (human), with Warehouse metadata and Resolution feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle planned backfill creates volume spikes | Backfill annotations from orchestrator. |

**Deliberately not doing**

- Table name: none.
- Column order: none.

**How the approach is proven**

Prove it offline on Detection precision on incident-linked alerts and Detection delay using time-ordered splits, then online on "Data incidents caught before consumers" with "Alert noise" as the guardrail. Watch for: Injected anomalies only and No lineage in evaluation.

## Baseline and production design

- **Baseline (build this first):** Hand-written SQL checks per table.
- **Production design:** Auto-profiled metrics with seasonal baselines, lineage-based impact ranking and LLM-assisted root-cause hints.

## Why AI, and why this kind

**Why AI.** Detect freshness, volume, schema and distribution problems in data pipelines before dashboards and models break. The evidence that separates good from bad outcomes (Freshness delay vs expected, Volume and null-rate deviation, Downstream consumer count) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "alert on every anomaly" are what teams reach for first, and they fail because most anomalies affect unused tables. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Auto-profiled metrics with seasonal baselines, lineage-based impact ranking and LLM-assisted root-cause hints.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Freshness delay vs expected, Volume and null-rate deviation, Downstream consumer count and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Hand-written SQL checks per table | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Auto-profiled metrics with seasonal baselines, lineage-based impact ranking and LLM-assisted root-cause hints | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Data incidents caught before consumers) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Injected anomalies only.
- Evaluation trap: No lineage in evaluation.
- Planned backfill creates volume spikes: a planned backfill creates volume spikes that raise false data-quality alerts.
- Schema change upstream: downstream failures.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
