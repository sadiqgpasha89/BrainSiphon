# Per-Customer Network Experience Scoring: data and feature specification

> Generated from the blueprint `telecom/per-customer-network-experience-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Per-Customer Network Experience Scoring · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Per-Customer Network Experience Scoring": Compute a daily experience score per customer from the sessions they actually had, so operations and care see who is truly affected rather than which cells are busy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Averaging KPIs by cell.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Session success rate | share of sessions that completed | Basic quality | Define per service type |   |   |   |
| Throughput versus plan | achieved throughput relative to the plan and time | Visible speed gap | Device limits matter |   |   |   |
| Latency and jitter for interactive apps | median and p95 per app type | Video and gaming experience | Use app classes not contents |   |   |   |
| Drop and failure events | calls dropped and failed attaches | Frustrating events | Count per usage hour |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Measure | Quality of sessions the customer used | Average cell KPIs | Cell averages hide the customers in the tail |
| Weighting | Weights learned against satisfaction and churn | Hand-set weights | Weights drift as apps change |
| Coverage | A reason when no score exists | Score from thin data | A shaky score drives wrong remedies |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Data volume alone | usage not quality |
| Handset age | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Session success rate inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: define per service type. |
| Throughput versus plan inputs | OSS/BSS platform team | BSS: CRM, order management and billing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: device limits matter. |
| Latency and jitter for interactive apps inputs | Customer data office | Network element configuration and orchestration layer | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use app classes not contents. |
| Drop and failure events inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: count per usage hour. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: per_customer_network_experience_scoring_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: session_success_rate, type: double, nullable: false }
    - { name: throughput_versus_plan, type: double, nullable: false }
    - { name: latency_and_jitter_for_interactive_apps, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Session success rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Throughput versus plan against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Session success rate, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE per_customer_network_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE per_customer_network_outputs (
  run_id TEXT NOT NULL REFERENCES per_customer_network_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE per_customer_network_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE per_customer_network_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Per-Customer Network Experience Scoring": Compute a daily experience score per customer from the sessions they actually had, so operations and care see who is truly affected rather than which cells are busy. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Session success rate | Share of sessions that completed. Basic quality. | Leakage risk to design against: Define per service type. |
| A signal-versus-noise trap in this use case: Measure | The true signal is quality of sessions the customer used; the common noise is average cell KPIs. | Cell averages hide the customers in the tail. |

**Ask the experts**

- [ ] What exactly does "Score based on aggregated session KPIs not content" mean in practice for per-customer network experience scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Session success rate" and "Throughput versus plan", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Contacts per low-score customer" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: averaging KPIs by cell, and who can confirm the cut-off times and splits?
- [ ] How often does "Heavy traveller" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| QoE | Quality of experience: how good a service feels to the user, such as video smoothness. |
| Core network | The central part of the network that handles authentication, session control and routing. |
| KPI | Key performance indicator: a measured value used to track cell or service health. |
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| Churn | The share of subscribers who leave in a period. |
| Handover | Moving an active session from one cell to another without dropping it. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Remaining useful life | The estimated time before a machine or component fails. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
