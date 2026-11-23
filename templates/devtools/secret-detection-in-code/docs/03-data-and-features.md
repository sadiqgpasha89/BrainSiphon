# Secret Detection in Code and Logs: data and feature specification

> Generated from the blueprint `devtools/secret-detection-in-code` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Secret Detection in Code and Logs · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Secret Detection in Code and Logs": Detect API keys, tokens and credentials in commits, logs and chat before they spread, block pushes and start rotation with the owner. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Raw secrets in findings.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pattern and entropy match | format and randomness of the string | Core | From scanners |   |   |   |
| Provider validation | whether the provider says the key is live | Confirmation | From provider checks |   |   |   |
| File context | test file, config or code | Likelihood | From the path |   |   |   |
| Commit history | where the secret first appeared | Scope | From version control |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Confirmed live secrets | Pattern matches | Many matches are test values |
| Action | Block, rotate and notify | Report only | A leaked secret needs rotation not a report |
| Privacy | Hashes of secrets in findings | Raw values in tickets | Findings can leak the secret again |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Developer name | personal data |
| Commit message | weak link |
| Branch name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pattern and entropy match inputs | Developer experience | Source control and code review platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from scanners. |
| Provider validation inputs | Platform engineering | CI/CD and artifact registry | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from provider checks. |
| File context inputs | Application security | Issue tracker and developer portal | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the path. |
| Commit history inputs | Developer experience | Source control and code review platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from version control. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: secret_detection_in_code_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pattern_and_entropy_match, type: double, nullable: false }
    - { name: provider_validation, type: double, nullable: false }
    - { name: file_context, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Pattern and entropy match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Provider validation against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pattern and entropy match, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE secret_detection_in_code_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE secret_detection_in_code_fields (
  document_id TEXT NOT NULL REFERENCES secret_detection_in_code_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE secret_detection_in_code_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Secret Detection in Code and Logs": Detect API keys, tokens and credentials in commits, logs and chat before they spread, block pushes and start rotation with the owner. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Application security depends on reachability | Scanners report many findings, but only some are reachable and exploitable in a given application. Prioritising by reachability, exposure and data sensitivity focuses scarce fixing time. | A raw severity score floods teams with findings that cannot be exploited. |
| Pipelines fail for many reasons | A broken build can come from code, dependencies, infrastructure or configuration. Finding the first real error in a long log, and linking it to recent changes, cuts the time to fix. | A diagnosis that does not show its evidence is hard to trust. |
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Pattern and entropy match | Format and randomness of the string. Core. | Leakage risk to design against: From scanners. |
| A signal-versus-noise trap in this use case: Label | The true signal is confirmed live secrets; the common noise is pattern matches. | Many matches are test values. |

**Ask the experts**

- [ ] What exactly does "Block high-confidence secrets at push within 2 s" mean in practice for secret detection in code and logs: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pattern and entropy match" and "Provider validation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Live secrets leaked" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: raw secrets in findings, and who can confirm the cut-off times and splits?
- [ ] How often does "Test credentials" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Secret scanning | Searching code and logs for exposed credentials. |
| Commit | A saved change to the code base. |
| Test coverage | The share of code run by tests. |
| Code owner | The team responsible for part of the code. |
| Code generation | Producing code with an AI model. |
| CI | Continuous integration: building and testing every change automatically. |
| Code review | Examination of a change by another engineer. |
| Monorepo | One repository holding many projects. |
| Lead time | The time from commit to production. |
| Technical debt | The cost of shortcuts that make later changes harder. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
