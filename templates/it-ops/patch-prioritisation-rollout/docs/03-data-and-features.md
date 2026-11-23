# Patch Prioritisation and Rollout Planning: data and feature specification

> Generated from the blueprint `it-ops/patch-prioritisation-rollout` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patch Prioritisation and Rollout Planning · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Patch Prioritisation and Rollout Planning": Prioritise patches by exploit risk, exposure and business criticality and plan staged rollouts with test rings, for change approvers to confirm. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: CVSS-only priority.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Exploit status | known exploitation | Urgency | From threat feeds |   |   |   |
| Exposure | internet-facing or internal | Impact | From the CMDB |   |   |   |
| System criticality | service tier | Impact | From the catalogue |   |   |   |
| Ring health | results from earlier rings | Gate | From monitoring |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Priority | Exploitation and exposure | CVSS score alone | Many high scores are not exploited |
| Rollout | Rings with health checks | All at once | A bad patch can take down many systems |
| Control | Approved change windows | Automatic installation | Production changes need owners |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Patch vendor name | weak link |
| Hostname | an identifier |
| Owner name | personal data |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Exploit status inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from threat feeds. |
| Exposure inputs | Service management | Configuration management database | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the CMDB. |
| System criticality inputs | Security operations | Monitoring, logging and cloud billing platforms | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the catalogue. |
| Ring health inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from monitoring. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: patch_prioritisation_rollout_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: exploit_status, type: double, nullable: false }
    - { name: exposure, type: double, nullable: false }
    - { name: system_criticality, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Exploit status and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Exposure against IT service management platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Exploit status, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| NVD vulnerability data feeds | https://nvd.nist.gov/vuln/data-feeds | Public US government data | All published CVEs with descriptions, severity scores and affected products | Severity is not exploitation; label exploitation from another source. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE patch_prioritisation_rollout_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE patch_prioritisation_rollout_outputs (
  run_id TEXT NOT NULL REFERENCES patch_prioritisation_rollout_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE patch_prioritisation_rollout_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE patch_prioritisation_rollout_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Patch Prioritisation and Rollout Planning": Prioritise patches by exploit risk, exposure and business criticality and plan staged rollouts with test rings, for change approvers to confirm. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Capacity is planned against peaks | Compute, storage and network capacity must cover peak demand with headroom, while lead times for hardware and commitments are long. Forecasts need ranges and business drivers. | Planning on averages leads to outages at peak. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Exploit status | Known exploitation. Urgency. | Leakage risk to design against: From threat feeds. |
| A signal-versus-noise trap in this use case: Priority | The true signal is exploitation and exposure; the common noise is cVSS score alone. | Many high scores are not exploited. |

**Ask the experts**

- [ ] What exactly does "Actively exploited vulnerabilities patched within 7 days" mean in practice for patch prioritisation and rollout planning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Exploit status" and "Exposure", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to patch exploited flaws" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: cVSS-only priority, and who can confirm the cut-off times and splits?
- [ ] How often does "Unpatchable system" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Change request | A proposal to change a production system. |
| Patch | A software update that fixes a flaw. |
| ITSM | IT service management: the practice and tools for managing IT services. |
| Configuration item | A component such as a server or application tracked in the CMDB. |
| CAB | Change advisory board: a group that reviews significant changes. |
| Savings plan | A flexible commitment to spend for a discount. |
| Maintenance window | An agreed time for planned work. |
| Separation of duties | Splitting a task so no one person can complete it alone. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| Modularity | A score for how well a division of the graph into groups separates dense communities. |
| Motif | A small recurring subgraph pattern such as a cycle or a fan-out. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
