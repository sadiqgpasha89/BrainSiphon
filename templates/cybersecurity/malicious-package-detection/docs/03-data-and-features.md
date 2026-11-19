# Malicious Open-Source Package Detection: data and feature specification

> Generated from the blueprint `cybersecurity/malicious-package-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Malicious Open-Source Package Detection · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Malicious Open-Source Package Detection": Detect malicious packages (typosquats, install-script malware, dependency confusion) in package registries and CI before they run. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test set made of known blocklists.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Install-script risk | network or exec calls in install hooks | Malware | Static analysis |   |   |   |
| Maintainer change or new publisher | ownership change | Takeover | Registry data |   |   |   |
| Name similarity to popular packages | edit distance and keyboard proximity | Typosquat | Popularity list |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Behaviour | Install-script and network behaviour in sandbox | Name similarity alone | Malicious code can hide under a normal-looking name |
| Provenance | Maintainer and publishing-pattern changes | Package contents only | Account takeover shows in the publishing pattern |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Package size | weak |
| Number of versions | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Install-script risk inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: static analysis. |
| Maintainer change or new publisher inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: registry data. |
| Name similarity to popular packages inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: popularity list. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: malicious_package_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: install_script_risk, type: double, nullable: false }
    - { name: maintainer_change_or_new_publisher, type: double, nullable: false }
    - { name: name_similarity_to_popular_packages, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Install-script risk and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Maintainer change or new publisher against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Install-script risk, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NVD vulnerability data feeds | https://nvd.nist.gov/vuln/data-feeds | Public US government data | All published CVEs with descriptions, severity scores and affected products | Severity is not exploitation; label exploitation from another source. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE malicious_package_detection_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE malicious_package_detection_fields (
  document_id TEXT NOT NULL REFERENCES malicious_package_detection_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE malicious_package_detection_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Malicious Open-Source Package Detection": Detect malicious packages (typosquats, install-script malware, dependency confusion) in package registries and CI before they run. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Software supply chain and code security | Malicious packages, leaked secrets, vulnerable code and insecure configurations enter through dependencies and developer workflows. Static analysis, package metadata and language models scan code, with the usual problem of many false positives. | A tool developers ignore protects nothing, so triage accuracy and fix guidance matter as much as detection. |
| Network and endpoint detection | Network detectors inspect flows, DNS and protocol behaviour for intrusions, scanning, tunnelling and denial of service; endpoint detectors watch processes, files, registry and memory for malware and ransomware. Training data come from labs and public captures, while production traffic is mostly benign and constantly changing. | Class imbalance, distribution shift and adversaries who adapt make detection rates on public datasets a poor guide to production performance. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Install-script risk | Network or exec calls in install hooks. Malware. | Leakage risk to design against: Static analysis. |
| A signal-versus-noise trap in this use case: Behaviour | The true signal is install-script and network behaviour in sandbox; the common noise is name similarity alone. | Malicious code can hide under a normal-looking name. |

**Ask the experts**

- [ ] What exactly does "Millions of packages" mean in practice for malicious open-source package detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Install-script risk" and "Maintainer change or new publisher", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Malicious packages blocked before install" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test set made of known blocklists, and who can confirm the cut-off times and splits?
- [ ] How often does "Legitimate package adds a postinstall script" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Typosquatting | Publishing a malicious package with a name close to a popular one. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| YARA / Sigma | Rule languages for describing malware patterns (YARA) and log-based detections (Sigma). |
| SBOM | Software bill of materials: the list of components inside a software product. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| Sandbox / detonation | Running a suspicious file in an isolated environment to observe what it does. |
| Honeypot | A decoy system built to attract and study attackers. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
