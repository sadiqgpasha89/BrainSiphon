# Gas Network Leak Detection: data and feature specification

> Generated from the blueprint `energy/gas-network-leak-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Gas Network Leak Detection · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Gas Network Leak Detection": Detect gas leaks along pipelines and in the distribution network from sensors, mobile survey data and pressure behaviour so repair crews are sent to the highest-risk leaks first. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting leaks equally.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Methane concentration enhancement | readings above background | Leak signal | From survey sensors |   |   |   |
| Wind speed and direction | wind at measurement time | Dispersion model | From weather |   |   |   |
| Distance to buildings and roads | proximity to receptors | Risk | From GIS |   |   |   |
| Pipe material and age | pipe attributes | Likelihood | From the register |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Risk | Leak size, location and nearby receptors | Leak count | A small leak near buildings can matter more than a large one in a field |
| Evidence | Sensor readings with wind and survey position | A single reading | Wind and position change the reading |
| Safety | An immediate human route for danger | Queue ranking alone | Some reports cannot wait |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Vehicle name | irrelevant |
| Survey route id | an identifier |
| Report author | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Methane concentration enhancement inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from survey sensors. |
| Wind speed and direction inputs | Asset management | Meter data management and billing (CIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from weather. |
| Distance to buildings and roads inputs | Retail and customer operations | Asset management and GIS | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from GIS. |
| Pipe material and age inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the register. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: gas_network_leak_detection_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: methane_concentration_enhancement, type: double, nullable: false }
    - { name: wind_speed_and_direction, type: double, nullable: false }
    - { name: distance_to_buildings_and_roads, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Methane concentration enhancement and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Wind speed and direction against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Methane concentration enhancement, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UNSW-NB15 | https://research.unsw.edu.au/projects/unsw-nb15-dataset | Research use with citation (see the page) | Network packets and flows with modern attack types and labels | Synthetic attack generation; class imbalance varies by split. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NSL-KDD | https://www.unb.ca/cic/datasets/nsl.html | Research use with citation (see the page) | A cleaned version of the classic KDD Cup 99 intrusion data | Very old; use only to test code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE gas_network_leak_detection_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE gas_network_leak_detection_detections (
  frame_id TEXT NOT NULL REFERENCES gas_network_leak_detection_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE gas_network_leak_detection_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Gas Network Leak Detection": Detect gas leaks along pipelines and in the distribution network from sensors, mobile survey data and pressure behaviour so repair crews are sent to the highest-risk leaks first. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Field crews need practical work orders | Crew scheduling depends on location, skills, parts, access and permits. Plans that ignore these constraints fail on the day. | A model that ranks jobs without capacity and travel produces schedules nobody can run. |
| Losses and theft hide in the balance | Technical losses come from physics and non-technical losses from theft, metering and billing faults. Comparing energy in with energy billed by feeder points to where losses occur. | Accusing customers on weak evidence harms trust, so cases need field verification. |
| Renewable output depends on weather | Solar and wind generation follow irradiance, cloud cover and wind speed, with ramps that are hard to predict. Forecast quality varies by site, season and horizon. | Probabilistic forecasts let operators size reserves, whereas point forecasts hide the risk. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Methane concentration enhancement | Readings above background. Leak signal. | Leakage risk to design against: From survey sensors. |
| A signal-versus-noise trap in this use case: Risk | The true signal is leak size, location and nearby receptors; the common noise is leak count. | A small leak near buildings can matter more than a large one in a field. |

**Ask the experts**

- [ ] What exactly does "Leak reports ranked by risk and proximity to people and buildings" mean in practice for gas network leak detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Methane concentration enhancement" and "Wind speed and direction", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to repair high-risk leaks" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: counting leaks equally, and who can confirm the cut-off times and splits?
- [ ] How often does "Sewer gas" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Leak detection | Finding losses in water or gas networks. |
| Pipe burst | A sudden failure of a water or gas pipe. |
| Pressure management | Controlling water pressure to cut leaks and bursts. |
| Work management | Systems for planning and tracking field jobs. |
| Dissolved gas analysis | Testing gas in transformer oil to detect faults. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control the network. |
| Dispatch | Deciding which generators or batteries produce and when. |
| Technical loss | Energy lost as heat in lines and equipment. |
| District metered area | A section of a water network with flow measured at its edges. |
| Meter data management | The system that stores and validates meter readings. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Exogenous variable | An input from outside the series, such as price or weather, used to explain it. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Transfer learning | Starting from a model pretrained on a large image set and adapting it to a small task dataset. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
