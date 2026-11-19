# Cloud IAM Privilege Anomaly & Least-Privilege: data and feature specification

> Generated from the blueprint `cybersecurity/cloud-iam-privilege-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cloud IAM Privilege Anomaly & Least-Privilege · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Cloud IAM Privilege Anomaly & Least-Privilege": Detect abnormal permission use and recommend least-privilege policies by learning actual usage across identities and roles. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Short usage windows.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Permission use ratio | used divided by granted permissions | Over-provisioning | Window length |   |   |   |
| Role-assumption chain depth | chain length to powerful role | Escalation | Graph |   |   |   |
| Unusual API call for principal | rarity of call for this identity | Anomaly | Baseline |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Usage | Right-size from observed usage with safety margins | Remove all unused permissions blindly | Rare but legitimate break-glass permissions get removed |
| Paths | Effective permissions through role chaining | Direct policies only | Escalation paths hide in chains |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Policy name | none |
| Number of policies | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Permission use ratio inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window length. |
| Role-assumption chain depth inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: graph. |
| Unusual API call for principal inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: baseline. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cloud_iam_privilege_anomaly_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: permission_use_ratio, type: double, nullable: false }
    - { name: role_assumption_chain_depth, type: double, nullable: false }
    - { name: unusual_api_call_for_principal, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Permission use ratio and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Role-assumption chain depth against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Permission use ratio, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Research release from Los Alamos National Laboratory (see the page) | 58 days of authentication, process, flow and DNS events with a red-team subset | Anonymised and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Elliptic Bitcoin transaction graph | https://www.kaggle.com/datasets/ellipticco/elliptic-data-set | See the dataset page; free Kaggle login | 200K Bitcoin transactions as a graph with licit and illicit labels and temporal steps | Anonymised features; labels cover only part of the graph. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE cloud_iam_privilege_anomaly_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE cloud_iam_privilege_anomaly_outputs (
  run_id TEXT NOT NULL REFERENCES cloud_iam_privilege_anomaly_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE cloud_iam_privilege_anomaly_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE cloud_iam_privilege_anomaly_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Cloud IAM Privilege Anomaly & Least-Privilege": Detect abnormal permission use and recommend least-privilege policies by learning actual usage across identities and roles. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Identity and access threats | Most breaches involve stolen or abused credentials: credential stuffing, account takeover, impossible travel, privilege escalation, over-permissioned cloud roles, and insiders. Detection reasons about behaviour over time and context rather than single events. | False positives hit real employees, so risk-based responses (step-up authentication) are preferred over hard blocks. |
| Vulnerability and risk management | Organisations track thousands of software vulnerabilities (CVEs), score their severity, and decide what to patch first. Few are ever exploited; exploit likelihood, asset criticality, exposure and compensating controls decide priority. Attack-path analysis shows how weaknesses chain together. | Prioritising by severity alone creates unmanageable lists; prioritising by exploit evidence and asset value cuts work and risk. |
| Operational technology and IoT security | Industrial control systems and IoT devices run physical processes with strict safety and availability requirements and little room for active probing. Detection relies on knowing normal process behaviour and physics. | False alarms or interference can halt a plant, so detection is passive and conservative. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Permission use ratio | Used divided by granted permissions. Over-provisioning. | Leakage risk to design against: Window length. |
| A signal-versus-noise trap in this use case: Usage | The true signal is right-size from observed usage with safety margins; the common noise is remove all unused permissions blindly. | Rare but legitimate break-glass permissions get removed. |

**Ask the experts**

- [ ] What exactly does "No outages from permission removal" mean in practice for cloud iam privilege anomaly & least-privilege: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Permission use ratio" and "Role-assumption chain depth", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Excess permissions removed" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: short usage windows, and who can confirm the cut-off times and splits?
- [ ] How often does "Quarterly job needs permissions rarely used" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| IAM | Identity and access management: the systems that decide who can do what. |
| Privilege escalation | Gaining higher access rights than intended. |
| Least privilege | Giving a system only the access it needs, so a compromised or fooled agent can do little harm. |
| Attack path | A chain of weaknesses and permissions that lets an attacker move from an entry point to a valuable asset. |
| UEBA | User and entity behaviour analytics: detecting deviations from a person's or device's normal behaviour. |
| SSO | Single sign-on: one login that grants access to many applications. |
| Misconfiguration | A security setting that is wrong or drifts from the intended baseline, especially in the cloud. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
