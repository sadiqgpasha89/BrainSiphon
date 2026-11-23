# SIM-Box & Bypass Fraud Detection: data and feature specification

> Generated from the blueprint `telecom/sim-box-bypass-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SIM-Box & Bypass Fraud Detection · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "SIM-Box & Bypass Fraud Detection": Detect SIM-box and interconnect bypass fraud from call patterns and network signalling, so illegal termination of international calls is found and blocked. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Per-line analysis only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Call fan-out and reciprocity | distinct destinations versus inbound calls ratio | Classic bypass pattern | Window per line |   |   |   |
| Cell and device concentration | many active SIMs in one cell and device cluster | Farm signal | Use anonymised device groups |   |   |   |
| Call duration profile | share of very short and fixed-length calls | Automated dialling | Compare with the segment |   |   |   |
| Test call match | matched test call routed through the suspected line | Confirmation | Needs a test programme |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Behaviour | Patterns of many short calls to many numbers with low inbound | Total call minutes | Heavy genuine users look busy too |
| Network | Groups of lines sharing a cell, device or time pattern | Single line analysis | Fraud is run as a farm of lines |
| Evidence | Test calls and CDR patterns together | CDR patterns alone | Blocking needs strong proof |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Subscriber name | irrelevant and private |
| Plan name alone | weak link |
| Number prefix alone | easily changed |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Call fan-out and reciprocity inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window per line. |
| Cell and device concentration inputs | OSS/BSS platform team | BSS: CRM, order management and billing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use anonymised device groups. |
| Call duration profile inputs | Customer data office | Network element configuration and orchestration layer | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: compare with the segment. |
| Test call match inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: needs a test programme. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sim_box_bypass_fraud_detection_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: call_fan_out_and_reciprocity, type: double, nullable: false }
    - { name: cell_and_device_concentration, type: double, nullable: false }
    - { name: call_duration_profile, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Call fan-out and reciprocity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Cell and device concentration against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Call fan-out and reciprocity, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE sim_box_bypass_fraud_detection_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE sim_box_bypass_fraud_detection_outputs (
  run_id TEXT NOT NULL REFERENCES sim_box_bypass_fraud_detection_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE sim_box_bypass_fraud_detection_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE sim_box_bypass_fraud_detection_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "SIM-Box & Bypass Fraud Detection": Detect SIM-box and interconnect bypass fraud from call patterns and network signalling, so illegal termination of international calls is found and blocked. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Revenue assurance finds money the operator should have billed | Usage records move through mediation, rating and billing, and errors in tariffs, mappings or partner settlements cause under-billing and leakage. Reconciling the stages finds the gaps. | Small percentage errors across millions of records become large sums, and some errors are invisible to the customer. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Provisioning turns an order into a working service | Activation spans order capture, inventory, number and SIM assignment, network configuration and billing set-up across OSS and BSS systems. Failures often come from data mismatches between those systems. | Fall-out in the middle of a multi-system flow leaves a paying customer without service, so orders need compensating steps and clear status. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Call fan-out and reciprocity | Distinct destinations versus inbound calls ratio. Classic bypass pattern. | Leakage risk to design against: Window per line. |
| A signal-versus-noise trap in this use case: Behaviour | The true signal is patterns of many short calls to many numbers with low inbound; the common noise is total call minutes. | Heavy genuine users look busy too. |

**Ask the experts**

- [ ] What exactly does "Features from call detail records only and never call content" mean in practice for sim-box & bypass fraud detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Call fan-out and reciprocity" and "Cell and device concentration", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Bypass minutes blocked" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: per-line analysis only, and who can confirm the cut-off times and splits?
- [ ] How often does "Legitimate call centre" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| SIM swap | Moving a number to a new SIM, a step abused in account takeover. |
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| ARPU | Average revenue per user: revenue divided by the number of subscribers in a period. |
| PRB | Physical resource block: the unit of radio capacity allocated to users in a cell. |
| SDN | Software-defined networking: separating control from forwarding so the network is programmable. |
| Mediation | The system that collects and normalises usage records before billing. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Lag feature | A past value of the series used as a predictor. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
