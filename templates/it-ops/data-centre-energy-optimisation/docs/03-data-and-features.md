# Data Centre Energy Optimisation: data and feature specification

> Generated from the blueprint `it-ops/data-centre-energy-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Data Centre Energy Optimisation · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Data Centre Energy Optimisation": Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Lowest temperature as the goal.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Inlet temperature by rack | temperature at servers | Constraint | From sensors |   |   |   |
| IT load | power drawn by servers | State | From power meters |   |   |   |
| Outside weather | temperature and humidity | Driver | From weather feeds |   |   |   |
| Cooling unit state | fan, valve and compressor state | Action | From building systems |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | Energy use within temperature limits | Lowest temperature | Over-cooling wastes energy |
| Safety | Hard limits and rollback | Unbounded control | Equipment damage is costly |
| Evaluation | A physics-based simulator and replay | Live trials only | Live tests risk equipment |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Rack name | an identifier |
| Vendor | weak link |
| Operator name | personal data |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Inlet temperature by rack inputs | Infrastructure and operations | IT service management platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from sensors. |
| IT load inputs | Service management | Configuration management database | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from power meters. |
| Outside weather inputs | Security operations | Monitoring, logging and cloud billing platforms | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from weather feeds. |
| Cooling unit state inputs | Infrastructure and operations | IT service management platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from building systems. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: data_centre_energy_optimisation_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: inlet_temperature_by_rack, type: double, nullable: false }
    - { name: it_load, type: double, nullable: false }
    - { name: outside_weather, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Inlet temperature by rack and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for IT load against IT service management platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Inlet temperature by rack, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE data_centre_energy_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  inlet_temperature_by_rack          DOUBLE PRECISION,
  it_load                            DOUBLE PRECISION,
  outside_weather                    DOUBLE PRECISION,
  cooling_unit_state                 DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE data_centre_energy_decisions (
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
CREATE TABLE data_centre_energy_labels (
  decision_id    UUID        NOT NULL REFERENCES data_centre_energy_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Data Centre Energy Optimisation": Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Cloud cost follows usage and tagging | Cost depends on instance types, storage, data transfer and commitments, and is attributed to teams by tags. Anomalies and idle resources are common sources of waste. | Cuts that ignore peak usage cause incidents, so recommendations carry risk and an owner. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Inlet temperature by rack | Temperature at servers. Constraint. | Leakage risk to design against: From sensors. |
| A signal-versus-noise trap in this use case: Objective | The true signal is energy use within temperature limits; the common noise is lowest temperature. | Over-cooling wastes energy. |

**Ask the experts**

- [ ] What exactly does "Inlet temperatures never exceed vendor limits" mean in practice for data centre energy optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Inlet temperature by rack" and "IT load", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Power usage effectiveness" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: lowest temperature as the goal, and who can confirm the cut-off times and splits?
- [ ] How often does "Sensor failure" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Change request | A proposal to change a production system. |
| CAB | Change advisory board: a group that reviews significant changes. |
| Telemetry | Data sent from systems about their state. |
| Separation of duties | Splitting a task so no one person can complete it alone. |
| DLP | Data loss prevention: controls that stop sensitive data leaving. |
| Licence optimisation | Matching software licences to real use. |
| Policy | The rule that maps a situation to an action. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Heuristic / local search | Fast methods that find good but not provably optimal solutions. |
| Remaining useful life | The estimated time before a machine or component fails. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
