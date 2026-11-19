# Warehouse Equipment Anomaly Detection: data and feature specification

> Generated from the blueprint `supply-chain/predictive-maintenance-warehouse-equipment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Warehouse Equipment Anomaly Detection · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Warehouse Equipment Anomaly Detection": Detect abnormal vibration, current and temperature in conveyors, sorters and AGVs in real time to prevent line stoppages. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Seeded faults unlike real failures.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Spectral vibration features | band energies and harmonics | Bearing faults | Sampling rate |   |   |   |
| Motor current signature | harmonic ratios | Electrical faults | Load condition |   |   |   |
| Residual to healthy model | reconstruction error by mode | Anomaly | Mode label |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Labels | Unsupervised or semi-supervised on healthy data | Supervised failure classifier | Failures are rare and diverse |
| Context | Operating-mode-conditional baselines | Global thresholds | Load and speed change signals |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw timestamp | none |
| Machine serial | encoded in mode |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Spectral vibration features inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: sampling rate. |
| Motor current signature inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: load condition. |
| Residual to healthy model inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: mode label. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: predictive_maintenance_warehouse_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: spectral_vibration_features, type: double, nullable: false }
    - { name: motor_current_signature, type: double, nullable: false }
    - { name: residual_to_healthy_model, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Spectral vibration features and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Motor current signature against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Spectral vibration features, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE predictive_maintenance_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  spectral_vibration_features        DOUBLE PRECISION,
  motor_current_signature            DOUBLE PRECISION,
  residual_to_healthy_model          DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE predictive_maintenance_decisions (
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
CREATE TABLE predictive_maintenance_labels (
  decision_id    UUID        NOT NULL REFERENCES predictive_maintenance_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Warehouse Equipment Anomaly Detection": Detect abnormal vibration, current and temperature in conveyors, sorters and AGVs in real time to prevent line stoppages. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Asset health and predictive maintenance | Vehicles, warehouse equipment and cold-chain units generate sensor data. Failures are rare and costly, the cost of a false alarm is a wasted inspection, and the data are right-censored (assets still running). | Value comes from lead time to act and avoided downtime, so evaluation uses cost-weighted decisions and time-to-failure, not accuracy. |
| Logistics networks: nodes, lanes and the physical flow | Goods move through suppliers, factories, ports, distribution centres, cross-docks and last-mile hubs. Each link has a lead time, a capacity and a cost, and disruptions (weather, strikes, congestion) propagate. Visibility data come from scans, telematics and partner feeds with delays and gaps. | Models sit on top of a physical network with hard constraints; plans must be feasible, not just predicted well. |
| Warehouse and fulfilment operations | Warehouses receive, store, pick, pack and ship. Layout and slotting set walking distance, wave planning groups orders, robots and humans share space, and labour is the main cost. Computer vision reads barcodes, dimensions and damage. | Throughput and labour per order are the business metrics; model accuracy is only useful insofar as it shortens a pick path or avoids a rehandle. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Spectral vibration features | Band energies and harmonics. Bearing faults. | Leakage risk to design against: Sampling rate. |
| A signal-versus-noise trap in this use case: Labels | The true signal is unsupervised or semi-supervised on healthy data; the common noise is supervised failure classifier. | Failures are rare and diverse. |

**Ask the experts**

- [ ] What exactly does "Edge inference on PLC-adjacent hardware" mean in practice for warehouse equipment anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Spectral vibration features" and "Motor current signature", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unplanned stoppage minutes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: seeded faults unlike real failures, and who can confirm the cut-off times and splits?
- [ ] How often does "Normal operating mode change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Predictive maintenance | Servicing equipment when data show failure is likely rather than on a fixed schedule. |
| Remaining useful life | The estimated time before a component fails. |
| DC (distribution centre) | A warehouse that receives goods from suppliers and ships to stores or customers. |
| Cross-docking | Moving goods directly from inbound to outbound vehicles with little or no storage. |
| Slotting | Deciding where in a warehouse each SKU is stored. |
| Wave picking | Releasing batches of orders to pickers together to balance workload and deadlines. |
| Pick path | The route a picker walks to collect items in an order. |
| AMR / AGV | Autonomous mobile robot and automated guided vehicle used to move goods in warehouses. |
| Rehandle | An extra move of a container or pallet needed to reach the one underneath. |
| Control tower | A central view of a supply chain's events and exceptions, used to react to disruptions. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
