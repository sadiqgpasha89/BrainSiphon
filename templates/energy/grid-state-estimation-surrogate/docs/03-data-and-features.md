# Fast Power Flow Surrogate for Contingency Screening: data and feature specification

> Generated from the blueprint `energy/grid-state-estimation-surrogate` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fast Power Flow Surrogate for Contingency Screening · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Fast Power Flow Surrogate for Contingency Screening": Screen thousands of network contingencies quickly with a learned power flow surrogate and send the dangerous ones to the full solver so operators see risks sooner. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replacing the certified solver.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Bus injections and topology | load, generation and switch states | Input state | From the state estimator |   |   |   |
| Line loading margin | distance of each element to its limit | Risk level | From the solver |   |   |   |
| Voltage margin | distance of bus voltages to limits | Risk level | From the solver |   |   |   |
| Contingency type | line, transformer or generator loss | Case class | From the contingency list |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Role | A screen that prioritises | A replacement for the solver | Operators need certified results for decisions |
| Metric | Recall of dangerous cases at a fixed review budget | Average error | Missed dangerous cases are the cost |
| Data | Cases across seasons and outage states | A typical day | Rare states hide the failure |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Case file name | an artefact |
| Operator name | irrelevant |
| Solver run id | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Bus injections and topology inputs | Network operations | SCADA and ADMS (advanced distribution management) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the state estimator. |
| Line loading margin inputs | Asset management | Meter data management and billing (CIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the solver. |
| Voltage margin inputs | Retail and customer operations | Asset management and GIS | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the solver. |
| Contingency type inputs | Network operations | SCADA and ADMS (advanced distribution management) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the contingency list. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: grid_state_estimation_surrogate_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: bus_injections_and_topology, type: double, nullable: false }
    - { name: line_loading_margin, type: double, nullable: false }
    - { name: voltage_margin, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Bus injections and topology and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Line loading margin against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Bus injections and topology, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Heart Disease | https://archive.ics.uci.edu/dataset/45/heart+disease | CC BY 4.0 (see the UCI page) | Small clinical dataset with a heart-disease label | Tiny; use only to test pipeline and calibration code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UNSW-NB15 | https://research.unsw.edu.au/projects/unsw-nb15-dataset | Research use with citation (see the page) | Network packets and flows with modern attack types and labels | Synthetic attack generation; class imbalance varies by split. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE grid_state_estimation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  bus_injections_and_topology        DOUBLE PRECISION,
  line_loading_margin                DOUBLE PRECISION,
  voltage_margin                     DOUBLE PRECISION,
  contingency_type                   DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE grid_state_estimation_decisions (
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
CREATE TABLE grid_state_estimation_labels (
  decision_id    UUID        NOT NULL REFERENCES grid_state_estimation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Fast Power Flow Surrogate for Contingency Screening": Screen thousands of network contingencies quickly with a learned power flow surrogate and send the dangerous ones to the full solver so operators see risks sooner. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Supply and demand must balance continuously | Electricity cannot be stored cheaply at scale, so generation, storage and demand response must match load in near real time. Forecast errors are paid for in reserves, imbalance charges or curtailment. | A forecast is judged by what its error costs the operator, not only by its average error. |
| Assets age and fail in the field | Transformers, cables, poles, pipes and pumps degrade with load, weather and time, and inspection data is sparse. Failures cause outages, safety incidents and environmental harm. | Asset health models must support the decision to inspect, repair or replace, within a safety-first culture. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Bus injections and topology | Load, generation and switch states. Input state. | Leakage risk to design against: From the state estimator. |
| A signal-versus-noise trap in this use case: Role | The true signal is a screen that prioritises; the common noise is a replacement for the solver. | Operators need certified results for decisions. |

**Ask the experts**

- [ ] What exactly does "Surrogate screening within 5 s for 10K contingencies" mean in practice for fast power flow surrogate for contingency screening: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Bus injections and topology" and "Line loading margin", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Screening time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: replacing the certified solver, and who can confirm the cut-off times and splits?
- [ ] How often does "Unseen topology" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Power factor | A measure of how effectively current is converted to useful power. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control the network. |
| Substation | A facility that transforms voltage and switches circuits. |
| Transformer | Equipment that changes voltage levels. |
| Curtailment | Reducing renewable output because the grid cannot take it. |
| Technical loss | Energy lost as heat in lines and equipment. |
| Frequency regulation | Keeping grid frequency near its target. |
| Unit commitment | Choosing which generators to run over a day or week. |
| Capacity factor | Actual output divided by maximum possible output. |
| State of charge | How full a battery is. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
