# Feeder Fault Location from Waveforms: data and feature specification

> Generated from the blueprint `energy/feeder-fault-location` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Feeder Fault Location from Waveforms · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Feeder Fault Location from Waveforms": Estimate the location of a fault on a distribution feeder from relay and meter waveforms so crews drive to the right span first and restoration is faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learning without a network model.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Apparent impedance to the fault | impedance computed from relay phasors | Distance estimate | Needs the feeder model |   |   |   |
| Fault type and phases | type of fault from relay data | Narrows the cause | From relay events |   |   |   |
| Downstream meter voltage sags | sag depth at smart meters | Branch isolation | Time aligned |   |   |   |
| Switching state | open and closed devices at the fault time | Topology context | From ADMS |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Truth | Locations confirmed by crews after repair | Impedance estimates alone | Physics estimates drift with the feeder model |
| Model | A hybrid of physics and learning | A learned map with no network model | Topology changes break pure learning |
| Output | A ranked list of spans with distance | One point | Crews need a search area |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Relay serial number | an identifier |
| Crew name | irrelevant |
| Event log wording | formatting |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Apparent impedance to the fault inputs | Network operations | SCADA and ADMS (advanced distribution management) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: needs the feeder model. |
| Fault type and phases inputs | Asset management | Meter data management and billing (CIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from relay events. |
| Downstream meter voltage sags inputs | Retail and customer operations | Asset management and GIS | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: time aligned. |
| Switching state inputs | Network operations | SCADA and ADMS (advanced distribution management) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from ADMS. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: feeder_fault_location_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: apparent_impedance_to_the_fault, type: double, nullable: false }
    - { name: fault_type_and_phases, type: double, nullable: false }
    - { name: downstream_meter_voltage_sags, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Apparent impedance to the fault and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Fault type and phases against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Apparent impedance to the fault, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| NYC Taxi and Limousine Commission trip records (AWS Open Data) | https://registry.opendata.aws/nyc-tlc-trip-records-pds/ | Open data (see the registry page) | Hundreds of millions of trip records with pickup and drop-off times, locations and fares | One city; no driver identities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE feeder_fault_location_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  apparent_impedance_to_the_fault    DOUBLE PRECISION,
  fault_type_and_phases              DOUBLE PRECISION,
  downstream_meter_voltage_sags      DOUBLE PRECISION,
  switching_state                    DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE feeder_fault_location_decisions (
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
CREATE TABLE feeder_fault_location_labels (
  decision_id    UUID        NOT NULL REFERENCES feeder_fault_location_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Feeder Fault Location from Waveforms": Estimate the location of a fault on a distribution feeder from relay and meter waveforms so crews drive to the right span first and restoration is faster. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Outage management is a fault location problem | When a fault trips protection, operators locate it from smart meter, SCADA and customer calls, then restore supply in stages. Faster location shortens outage minutes. | Customer minutes lost are the regulated measure, so restoration order matters as much as detection. |
| Field crews need practical work orders | Crew scheduling depends on location, skills, parts, access and permits. Plans that ignore these constraints fail on the day. | A model that ranks jobs without capacity and travel produces schedules nobody can run. |
| Smart meters produce large volumes of interval data | Meters report consumption at short intervals, which supports billing, loss detection and demand analytics but raises privacy concerns because the pattern reveals household behaviour. | Analytics should use aggregation and access controls and avoid inferring sensitive household behaviour. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Apparent impedance to the fault | Impedance computed from relay phasors. Distance estimate. | Leakage risk to design against: Needs the feeder model. |
| A signal-versus-noise trap in this use case: Truth | The true signal is locations confirmed by crews after repair; the common noise is impedance estimates alone. | Physics estimates drift with the feeder model. |

**Ask the experts**

- [ ] What exactly does "Candidate span list within 30 s of the fault" mean in practice for feeder fault location from waveforms: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Apparent impedance to the fault" and "Fault type and phases", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Patrol time per fault" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: learning without a network model, and who can confirm the cut-off times and splits?
- [ ] How often does "Wrong topology" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Protection relay | A device that trips a circuit during a fault. |
| AMI | Advanced metering infrastructure: smart meters and the network that reads them. |
| Feeder | A distribution line that carries power from a substation to customers. |
| Vegetation management | Trimming trees near lines to prevent faults. |
| Substation | A facility that transforms voltage and switches circuits. |
| Dissolved gas analysis | Testing gas in transformer oil to detect faults. |
| Partial discharge | Small electrical discharges that signal insulation damage. |
| Meter data management | The system that stores and validates meter readings. |
| Outage management system | Software that tracks outages and crews. |
| Work management | Systems for planning and tracking field jobs. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
