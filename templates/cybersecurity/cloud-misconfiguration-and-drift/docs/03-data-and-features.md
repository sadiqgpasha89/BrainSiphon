# Cloud Misconfiguration & Drift Detection: data and feature specification

> Generated from the blueprint `cybersecurity/cloud-misconfiguration-and-drift` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cloud Misconfiguration & Drift Detection · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Cloud Misconfiguration & Drift Detection": Find risky cloud configurations (public buckets, open security groups) and rank them by exposure and data sensitivity. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on rule hits only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Internet reachability | network path from internet | Exposure | Graph |   |   |   |
| Data classification | sensitivity of stored data | Impact | DLP tags |   |   |   |
| Change event recency | time since misconfiguration was introduced | Urgency | Event logs |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Combine configuration with reachability and data sensitivity | Finding counts | A public bucket with logs is lower risk than one with PII |
| Drift | Detect configuration changes via event stream | Periodic full scans | Scans miss short-lived exposures |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Resource name | none |
| Tag count | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Internet reachability inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: graph. |
| Data classification inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: DLP tags. |
| Change event recency inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event logs. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cloud_misconfiguration_and_drift_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: internet_reachability, type: double, nullable: false }
    - { name: data_classification, type: double, nullable: false }
    - { name: change_event_recency, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Internet reachability and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Data classification against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Internet reachability, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UNSW-NB15 | https://research.unsw.edu.au/projects/unsw-nb15-dataset | Research use with citation (see the page) | Network packets and flows with modern attack types and labels | Synthetic attack generation; class imbalance varies by split. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE cloud_misconfiguration_and_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE cloud_misconfiguration_and_outputs (
  run_id TEXT NOT NULL REFERENCES cloud_misconfiguration_and_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE cloud_misconfiguration_and_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE cloud_misconfiguration_and_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Cloud Misconfiguration & Drift Detection": Find risky cloud configurations (public buckets, open security groups) and rank them by exposure and data sensitivity. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Vulnerability and risk management | Organisations track thousands of software vulnerabilities (CVEs), score their severity, and decide what to patch first. Few are ever exploited; exploit likelihood, asset criticality, exposure and compensating controls decide priority. Attack-path analysis shows how weaknesses chain together. | Prioritising by severity alone creates unmanageable lists; prioritising by exploit evidence and asset value cuts work and risk. |
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Internet reachability | Network path from internet. Exposure. | Leakage risk to design against: Graph. |
| A signal-versus-noise trap in this use case: Context | The true signal is combine configuration with reachability and data sensitivity; the common noise is finding counts. | A public bucket with logs is lower risk than one with PII. |

**Ask the experts**

- [ ] What exactly does "Millions of resources" mean in practice for cloud misconfiguration & drift detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Internet reachability" and "Data classification", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mean time to remediate critical exposures" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on rule hits only, and who can confirm the cut-off times and splits?
- [ ] How often does "Intentional public bucket for a website" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Misconfiguration | A security setting that is wrong or drifts from the intended baseline, especially in the cloud. |
| Attack path | A chain of weaknesses and permissions that lets an attacker move from an entry point to a valuable asset. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| YARA / Sigma | Rule languages for describing malware patterns (YARA) and log-based detections (Sigma). |
| Privilege escalation | Gaining higher access rights than intended. |
| IAM | Identity and access management: the systems that decide who can do what. |
| Crown jewels | The assets whose loss would most harm the organisation. |
| Honeypot | A decoy system built to attract and study attackers. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Node / edge | The entities in a graph and the relationships between them. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
