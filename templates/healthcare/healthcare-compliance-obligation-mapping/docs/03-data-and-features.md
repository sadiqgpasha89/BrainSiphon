# Healthcare Compliance Obligation Mapping: data and feature specification

> Generated from the blueprint `healthcare/healthcare-compliance-obligation-mapping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Obligation Mapping · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Compliance Obligation Mapping": Map regulatory obligations to the policies, controls, procedures, systems, owners, facilities and evidence that address them, and show uncovered obligations, conflicting policies and evidence gaps in a traceable obligation graph. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating similarity as coverage.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Semantic match score | similarity between requirement text and policy or control statement | Proposes candidate edges | Embedding and cross-encoder |   |   |   |
| Terminology and scope overlap | shared defined terms, facility types and service lines | Reduces false links | Extracted metadata |   |   |   |
| Existing confirmed edges | previously confirmed mappings for similar requirements | Supervises ranking | Earlier mapping rounds |   |   |   |
| Owner and system linkage | owners and systems already tied to a control | Completes the graph | Directory as at mapping |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Edges | Requirement-to-control edges with source citations | Similarity list | Auditors need a defensible link |
| Coverage | Uncovered requirements listed | Assumed coverage | A hidden gap is a compliance risk |
| Conflicts | Policies that contradict each other flagged | Single-policy view | Conflicts cause inconsistent practice |
| Confirmation | Experts confirm each mapping | Automatic mapping | Applicability is a legal judgment |
| Versioning | Edges tied to source and policy versions | Current-state map only | Past audits need the map as it was |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Policy title | not content |
| Requirement numbering style | layout |
| Document author | not coverage |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Semantic match score inputs | Compliance | Approved regulatory source store | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: embedding and cross-encoder. |
| Terminology and scope overlap inputs | Legal | Policy management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: extracted metadata. |
| Existing confirmed edges inputs | Policy owners | Control framework | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: earlier mapping rounds. |
| Owner and system linkage inputs | Internal audit | Process and system catalogue | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: directory as at mapping. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_compliance_obligation_mapping_inputs.v1
owner: compliance@example.com
system_of_record: Approved regulatory source store
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: semantic_match_score, type: double, nullable: false }
    - { name: terminology_and_scope_overlap, type: double, nullable: false }
    - { name: existing_confirmed_edges, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Semantic match score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Terminology and scope overlap against Approved regulatory source store
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Semantic match score, traces back to Approved regulatory source store; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE healthcare_compliance_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE healthcare_compliance_outputs (
  run_id TEXT NOT NULL REFERENCES healthcare_compliance_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE healthcare_compliance_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE healthcare_compliance_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Compliance Obligation Mapping": Map regulatory obligations to the policies, controls, procedures, systems, owners, facilities and evidence that address them, and show uncovered obligations, conflicting policies and evidence gaps in a traceable obligation graph. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Semantic match score | Similarity between requirement text and policy or control statement. Proposes candidate edges. | Leakage risk to design against: Embedding and cross-encoder. |
| A signal-versus-noise trap in this use case: Edges | The true signal is requirement-to-control edges with source citations; the common noise is similarity list. | Auditors need a defensible link. |

**Ask the experts**

- [ ] What exactly does "Legal or compliance experts confirm every mapping and every applicability decision" mean in practice for healthcare compliance obligation mapping: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Semantic match score" and "Terminology and scope overlap", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mappings confirmed per expert hour" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating similarity as coverage, and who can confirm the cut-off times and splits?
- [ ] How often does "Requirement split across several clauses" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Node / edge | The entities in a graph and the relationships between them. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
