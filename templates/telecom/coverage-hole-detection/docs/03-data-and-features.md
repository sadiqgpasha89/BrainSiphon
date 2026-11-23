# Coverage Hole Detection from Crowd Measurements: data and feature specification

> Generated from the blueprint `telecom/coverage-hole-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Coverage Hole Detection from Crowd Measurements · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Coverage Hole Detection from Crowd Measurements": Find locations with weak or absent coverage from anonymised device measurements and drive-test data, so planning targets the areas that users actually struggle in. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating sample counts as demand.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Weak-signal share | share of measurements below the coverage threshold per grid | Primary hole signal | Needs enough samples per tile |   |   |   |
| Call setup failure and drop rate | failure rate for sessions in the tile | Experience evidence | Attribute to coverage not core faults |   |   |   |
| Distance to nearest serving site | metres to the closest site | Explains the cause | From site inventory |   |   |   |
| Terrain and building clutter | height and land-use class of the tile | Explains shadowing | Needs a recent map |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Sampling | Measurements weighted by population and activity | Raw sample counts | Samples cluster where people stand not where they need coverage |
| Context | Indoor versus outdoor and device type | Pooled signal strength | Indoor losses are 10 to 20 dB |
| Privacy | Aggregates with minimum counts | Individual traces | Traces re-identify people |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Individual device identifiers | privacy risk and no gain |
| Handset brand alone | confounded with price |
| Time of day alone | does not explain coverage |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Weak-signal share inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: needs enough samples per tile. |
| Call setup failure and drop rate inputs | OSS/BSS platform team | BSS: CRM, order management and billing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: attribute to coverage not core faults. |
| Distance to nearest serving site inputs | Customer data office | Network element configuration and orchestration layer | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from site inventory. |
| Terrain and building clutter inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: needs a recent map. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: coverage_hole_detection_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: weak_signal_share, type: double, nullable: false }
    - { name: call_setup_failure_and_drop_rate, type: double, nullable: false }
    - { name: distance_to_nearest_serving_site, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Weak-signal share and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Call setup failure and drop rate against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Weak-signal share, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| California Housing (scikit-learn) | https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_california_housing.html | BSD-3 code; census-derived data | 20,640 census block groups with median house value, income and location, loaded with one function call | Block-group medians from 1990, not individual homes; values are capped. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE coverage_hole_detection_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE coverage_hole_detection_outputs (
  run_id TEXT NOT NULL REFERENCES coverage_hole_detection_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE coverage_hole_detection_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE coverage_hole_detection_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Coverage Hole Detection from Crowd Measurements": Find locations with weak or absent coverage from anonymised device measurements and drive-test data, so planning targets the areas that users actually struggle in. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Subscriber data is regulated | Location, call and browsing records are personal data with retention limits, consent requirements and lawful-access rules. Analytics normally run on pseudonymised, aggregated data with strict access controls. | A use case that needs identified location data needs a legal basis and tight controls before any model is built. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Weak-signal share | Share of measurements below the coverage threshold per grid. Primary hole signal. | Leakage risk to design against: Needs enough samples per tile. |
| A signal-versus-noise trap in this use case: Sampling | The true signal is measurements weighted by population and activity; the common noise is raw sample counts. | Samples cluster where people stand not where they need coverage. |

**Ask the experts**

- [ ] What exactly does "Device measurements aggregated and k-anonymised before analysis" mean in practice for coverage hole detection from crowd measurements: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Weak-signal share" and "Call setup failure and drop rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Planned sites placed in confirmed holes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating sample counts as demand, and who can confirm the cut-off times and splits?
- [ ] How often does "Sparse area" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| Root cause analysis | Finding the underlying fault behind a set of symptoms. |
| Cell site | A location with antennas and radio equipment serving a coverage area. |
| Core network | The central part of the network that handles authentication, session control and routing. |
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| KPI | Key performance indicator: a measured value used to track cell or service health. |
| Order fall-out | An order that fails part way through a multi-system flow. |
| Trouble ticket | A record of a fault or complaint that tracks diagnosis and repair. |
| Alarm correlation | Grouping related alarms to find a common cause. |
| Truck roll | Sending a field technician to a site. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Transitive closure | Adding links implied by chains of links; in clustering it merges groups that share one wrong edge. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
