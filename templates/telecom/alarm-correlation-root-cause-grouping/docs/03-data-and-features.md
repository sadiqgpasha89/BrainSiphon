# Alarm Correlation & Root-Cause Grouping: data and feature specification

> Generated from the blueprint `telecom/alarm-correlation-root-cause-grouping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Alarm Correlation & Root-Cause Grouping · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Alarm Correlation & Root-Cause Grouping": Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Time-window correlation without topology.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Topological distance to the alarm cluster | hop count on the dependency graph | Near the centre suggests the cause | Topology must be current |   |   |   |
| Alarm onset order | which alarm in the group fired first within clock tolerance | Cause precedes symptom | Element clocks drift and need normalising |   |   |   |
| Historical co-occurrence | how often two alarm types appeared together in confirmed incidents | Learns real fault patterns | Use only confirmed incident labels |   |   |   |
| Service impact breadth | subscribers or services behind the candidate element | Ranks what matters | Join to the live service model |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Structure | Topology and service dependency edges between elements | Time proximity alone | Unrelated faults in the same minute get merged |
| Direction | Upstream elements raise root-cause candidates before downstream symptoms | Treating all alarms as equals | The loudest alarm is rarely the cause |
| Memory | Historical incident groupings confirmed by engineers | Raw alarm counts | Counts reward noisy devices |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Alarm severity assigned by the vendor | scales differ across vendors |
| Alarm text length | a formatting artefact |
| Element age | weak link to this fault |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Topological distance to the alarm cluster inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: topology must be current. |
| Alarm onset order inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: element clocks drift and need normalising. |
| Historical co-occurrence inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: use only confirmed incident labels. |
| Service impact breadth inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: join to the live service model. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: alarm_correlation_root_cause_grouping_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: topological_distance_to_the_alarm, type: double, nullable: false }
    - { name: alarm_onset_order, type: double, nullable: false }
    - { name: historical_co_occurrence, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Topological distance to the alarm cluster and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Alarm onset order against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Topological distance to the alarm cluster, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Elliptic Bitcoin transaction graph | https://www.kaggle.com/datasets/ellipticco/elliptic-data-set | See the dataset page; free Kaggle login | 200K Bitcoin transactions as a graph with licit and illicit labels and temporal steps | Anonymised features; labels cover only part of the graph. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE alarm_correlation_root_cause_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  topological_distance_to_the_alarm  DOUBLE PRECISION,
  alarm_onset_order                  DOUBLE PRECISION,
  historical_co_occurrence           DOUBLE PRECISION,
  service_impact_breadth             DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE alarm_correlation_root_cause_decisions (
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
CREATE TABLE alarm_correlation_root_cause_labels (
  decision_id    UUID        NOT NULL REFERENCES alarm_correlation_root_cause_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Alarm Correlation & Root-Cause Grouping": Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Topological distance to the alarm cluster | Hop count on the dependency graph. Near the centre suggests the cause. | Leakage risk to design against: Topology must be current. |
| A signal-versus-noise trap in this use case: Structure | The true signal is topology and service dependency edges between elements; the common noise is time proximity alone. | Unrelated faults in the same minute get merged. |

**Ask the experts**

- [ ] What exactly does "Grouping must respect the live topology and service dependencies" mean in practice for alarm correlation & root-cause grouping: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Topological distance to the alarm cluster" and "Alarm onset order", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Tickets per underlying fault" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: time-window correlation without topology, and who can confirm the cut-off times and splits?
- [ ] How often does "Flapping link" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Alarm correlation | Grouping related alarms to find a common cause. |
| Root cause analysis | Finding the underlying fault behind a set of symptoms. |
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| MTTR | Mean time to repair: the average time from fault to restored service. |
| Provisioning | Configuring the network and systems so a purchased service works. |
| Trouble ticket | A record of a fault or complaint that tracks diagnosis and repair. |
| Node / edge | The entities in a graph and the relationships between them. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Lag feature | A past value of the series used as a predictor. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
