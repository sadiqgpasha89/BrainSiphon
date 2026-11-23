# Configuration Drift Detection: data and feature specification

> Generated from the blueprint `it-ops/configuration-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Configuration Drift Detection · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Configuration Drift Detection": Compare running configuration with the approved baseline from infrastructure code, detect drift and classify it as harmless, risky or unauthorised for owners to fix or accept. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Last seen state as baseline.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Setting difference | declared versus actual value | Core | From scans |   |   |   |
| Setting sensitivity | security or availability relevance | Risk | From policy |   |   |   |
| Change record link | whether a change explains the drift | Authorisation | From ITSM |   |   |   |
| Time since drift | how long it persisted | Priority | From scans |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | Declared state in version control | Last seen state | The last seen state may already be wrong |
| Class | Risk by setting and target | All drift equal | Some drift is harmless |
| Action | Revert through code review | Direct console edits | Console edits create more drift |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Resource name | an identifier |
| Scanner name | weak link |
| Owner name | personal data |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Setting difference inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from scans. |
| Setting sensitivity inputs | Service management | Configuration management database | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from policy. |
| Change record link inputs | Security operations | Monitoring, logging and cloud billing platforms | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from ITSM. |
| Time since drift inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from scans. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: configuration_drift_detection_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: setting_difference, type: double, nullable: false }
    - { name: setting_sensitivity, type: double, nullable: false }
    - { name: change_record_link, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Setting difference and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Setting sensitivity against IT service management platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Setting difference, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE configuration_drift_detection_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE configuration_drift_detection_outputs (
  run_id TEXT NOT NULL REFERENCES configuration_drift_detection_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE configuration_drift_detection_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE configuration_drift_detection_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Configuration Drift Detection": Compare running configuration with the approved baseline from infrastructure code, detect drift and classify it as harmless, risky or unauthorised for owners to fix or accept. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Security operations is a triage problem | Security tools raise far more alerts than analysts can read. Context from identity, endpoint and network data decides which alerts matter, and containment is a human decision. | Automatic containment on a wrong alert can stop the business. |
| Alerts are mostly noise | Monitoring tools raise thousands of alerts, many duplicate or symptoms of one fault. Grouping alerts by topology and time into incidents reduces pages and speeds diagnosis. | Suppressing alerts without visibility can hide a real outage, so grouped alerts must stay inspectable. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Setting difference | Declared versus actual value. Core. | Leakage risk to design against: From scans. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is declared state in version control; the common noise is last seen state. | The last seen state may already be wrong. |

**Ask the experts**

- [ ] What exactly does "Drift reports within 1 hour of detection" mean in practice for configuration drift detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Setting difference" and "Setting sensitivity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unmanaged drift" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: last seen state as baseline, and who can confirm the cut-off times and splits?
- [ ] How often does "Auto-managed settings" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Drift | Differences between declared and actual configuration. |
| Configuration item | A component such as a server or application tracked in the CMDB. |
| Change request | A proposal to change a production system. |
| MTTD | Mean time to detect a problem. |
| CMDB | Configuration management database: records of IT assets and their relationships. |
| Problem record | A record of the underlying cause of one or more incidents. |
| Postmortem | A blameless review after an incident. |
| Infrastructure as code | Defining infrastructure in version-controlled files. |
| EDR | Endpoint detection and response software. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
