# Sleeping Cell Detection: data and feature specification

> Generated from the blueprint `telecom/sleeping-cell-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sleeping Cell Detection · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Sleeping Cell Detection": Detect cells that appear healthy to the alarm system but carry no traffic or serve users badly, so silent outages are found in minutes not days. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training only on alarmed cells.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Traffic deviation from peers | ratio of actual to predicted traffic from similar cells | Primary silent signal | Peers from the same area and class |   |   |   |
| Attach and handover success | success rate of connection attempts and handovers | Shows users failing | Needs sufficient attempts |   |   |   |
| Neighbour load increase | extra load on neighbours when a cell goes quiet | Corroborates the silence | Verify neighbours are healthy |   |   |   |
| Time since last user connection | minutes without any attach | Hard evidence | Zero in low-traffic cells at night |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Reference | Expected traffic from similar cells at the same time | A fixed minimum traffic | Quiet rural cells would trigger constantly |
| Evidence | Several KPIs falling together | One counter | A single counter can be a measurement fault |
| Labels | Engineer-confirmed silent outages | Cells that later raised an alarm | Alarm-labelled data misses the silent cases |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Alarm count | the failure is silent |
| Software version alone | weak link |
| Cell age | unrelated |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Traffic deviation from peers inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: peers from the same area and class. |
| Attach and handover success inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs sufficient attempts. |
| Neighbour load increase inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: verify neighbours are healthy. |
| Time since last user connection inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: zero in low-traffic cells at night. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sleeping_cell_detection_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: traffic_deviation_from_peers, type: double, nullable: false }
    - { name: attach_and_handover_success, type: double, nullable: false }
    - { name: neighbour_load_increase, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Traffic deviation from peers and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Attach and handover success against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Traffic deviation from peers, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE sleeping_cell_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  traffic_deviation_from_peers       DOUBLE PRECISION,
  attach_and_handover_success        DOUBLE PRECISION,
  neighbour_load_increase            DOUBLE PRECISION,
  time_since_last_user_connection    DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE sleeping_cell_detection_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE sleeping_cell_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES sleeping_cell_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Sleeping Cell Detection": Detect cells that appear healthy to the alarm system but carry no traffic or serve users badly, so silent outages are found in minutes not days. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Capacity is planned for the busy hour | Traffic is forecast per cell and per link for the busiest period, with growth from new devices, video and events. Spectrum and backhaul upgrades take months, so forecasts must be early and carry uncertainty. | Planning on average load causes congestion at peak, while over-building wastes capital. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Traffic deviation from peers | Ratio of actual to predicted traffic from similar cells. Primary silent signal. | Leakage risk to design against: Peers from the same area and class. |
| A signal-versus-noise trap in this use case: Reference | The true signal is expected traffic from similar cells at the same time; the common noise is a fixed minimum traffic. | Quiet rural cells would trigger constantly. |

**Ask the experts**

- [ ] What exactly does "No dependence on alarms alone" mean in practice for sleeping cell detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Traffic deviation from peers" and "Attach and handover success", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Silent outage duration" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training only on alarmed cells, and who can confirm the cut-off times and splits?
- [ ] How often does "Low-traffic hours" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| KPI | Key performance indicator: a measured value used to track cell or service health. |
| Handover | Moving an active session from one cell to another without dropping it. |
| Backhaul | The link that carries traffic from a cell site to the core network. |
| Trouble ticket | A record of a fault or complaint that tracks diagnosis and repair. |
| Alarm correlation | Grouping related alarms to find a common cause. |
| Truck roll | Sending a field technician to a site. |
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| PRB | Physical resource block: the unit of radio capacity allocated to users in a cell. |
| Root cause analysis | Finding the underlying fault behind a set of symptoms. |
| Cell site | A location with antennas and radio equipment serving a coverage area. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
