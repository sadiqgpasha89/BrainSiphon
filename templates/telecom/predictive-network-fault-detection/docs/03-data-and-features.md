# Predictive Network Fault Detection: data and feature specification

> Generated from the blueprint `telecom/predictive-network-fault-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Network Fault Detection · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Predictive Network Fault Detection": Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split across time.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Counter drift against peers | z-score of error and retransmit counters versus similar elements | Early degradation signature | Peer groups must exclude the failing element |   |   |   |
| Temperature and power trend | slope of temperature and supply voltage over 7 days | Hardware ageing signal | Needs sensor calibration per model |   |   |   |
| Software version and recent restart count | version and number of resets in 30 days | Instability indicator | Version must be as at prediction time |   |   |   |
| Traffic load percentile | busy-hour load relative to capacity | Overload precedes failure in some classes | Seasonality adjustment is required |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Confirmed failures with timestamped root cause | Any alarm after the fact | Alarms include false positives and cascading effects |
| Window | Counters over a horizon matched to the failure mechanism | One fixed window for all equipment | Optical, power and software faults have different lead signals |
| Population | Compare each element to similar peers on the same vendor and software | Global thresholds | Equipment ages and loads differ widely |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Element hostname | encodes site not health |
| Technician name on last visit | no causal link |
| Raw alarm count | dominated by chatty devices |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Counter drift against peers inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: peer groups must exclude the failing element. |
| Temperature and power trend inputs | OSS/BSS platform team | BSS: CRM, order management and billing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: needs sensor calibration per model. |
| Software version and recent restart count inputs | Customer data office | Network element configuration and orchestration layer | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: version must be as at prediction time. |
| Traffic load percentile inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: seasonality adjustment is required. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: predictive_network_fault_detection_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: counter_drift_against_peers, type: double, nullable: false }
    - { name: temperature_and_power_trend, type: double, nullable: false }
    - { name: software_version_and_recent_restart, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Counter drift against peers and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Temperature and power trend against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Counter drift against peers, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Loghub system log collection | https://github.com/logpai/loghub | Research use (see the repository) | Real log datasets from distributed systems, supercomputers and applications | Labels are sparse and system-specific. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE predictive_network_fault_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE predictive_network_fault_outputs (
  run_id TEXT NOT NULL REFERENCES predictive_network_fault_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE predictive_network_fault_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE predictive_network_fault_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Predictive Network Fault Detection": Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Capacity is planned for the busy hour | Traffic is forecast per cell and per link for the busiest period, with growth from new devices, video and events. Spectrum and backhaul upgrades take months, so forecasts must be early and carry uncertainty. | Planning on average load causes congestion at peak, while over-building wastes capital. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Counter drift against peers | Z-score of error and retransmit counters versus similar elements. Early degradation signature. | Leakage risk to design against: Peer groups must exclude the failing element. |
| A signal-versus-noise trap in this use case: Label | The true signal is confirmed failures with timestamped root cause; the common noise is any alarm after the fact. | Alarms include false positives and cascading effects. |

**Ask the experts**

- [ ] What exactly does "Alerts need at least 12 hours of lead time for planned work" mean in practice for predictive network fault detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Counter drift against peers" and "Temperature and power trend", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unplanned outage minutes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: random split across time, and who can confirm the cut-off times and splits?
- [ ] How often does "New equipment type" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Alarm correlation | Grouping related alarms to find a common cause. |
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| Root cause analysis | Finding the underlying fault behind a set of symptoms. |
| Site outage | Loss of service at a cell site or link. |
| MTTR | Mean time to repair: the average time from fault to restored service. |
| Trouble ticket | A record of a fault or complaint that tracks diagnosis and repair. |
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| Core network | The central part of the network that handles authentication, session control and routing. |
| NFV | Network function virtualisation: running network functions as software on standard servers. |
| SDN | Software-defined networking: separating control from forwarding so the network is programmable. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Forecast horizon | How many steps ahead a forecast looks. |
