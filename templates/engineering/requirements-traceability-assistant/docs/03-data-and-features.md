# Requirements Traceability Assistant: data and feature specification

> Generated from the blueprint `engineering/requirements-traceability-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Requirements Traceability Assistant · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Requirements Traceability Assistant": Link requirements to design elements, tests and changes, find gaps and conflicts and propose trace links for engineers to confirm. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Similarity as compliance.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Text similarity | requirement and design element text | Candidate | From a text model |   |   |   |
| Existing trace links | confirmed links | Truth | From the requirements tool |   |   |   |
| Test coverage | tests linked to the requirement | Gap | From the test system |   |   |   |
| Change history | updates to requirements and design | Impact | From version control |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Link | Confirmed trace links | Text similarity | Similar text may not mean satisfaction |
| Role | Propose and find gaps | Declare compliance | Compliance needs engineers |
| Value | Impact analysis | A link count | Counts can hide gaps |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Author name | personal data |
| Document template | an artefact |
| Requirement id format | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Text similarity inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from a text model. |
| Existing trace links inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the requirements tool. |
| Test coverage inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the test system. |
| Change history inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from version control. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: requirements_traceability_assistant_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: text_similarity, type: double, nullable: false }
    - { name: existing_trace_links, type: double, nullable: false }
    - { name: test_coverage, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Text similarity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Existing trace links against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Text similarity, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE requirements_traceability_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE requirements_traceability_outputs (
  run_id TEXT NOT NULL REFERENCES requirements_traceability_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE requirements_traceability_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE requirements_traceability_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Requirements Traceability Assistant": Link requirements to design elements, tests and changes, find gaps and conflicts and propose trace links for engineers to confirm. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Drawings and models carry the design information | Information sits in CAD drawings, PDFs and BIM models, often in different revisions and disciplines. Reading it reliably is a prerequisite for most automation. | Using the wrong revision is a common and costly error. |
| Clashes between disciplines are common | Structure, services and architecture are modelled by different teams, and their elements collide. Not every clash needs action, and the important ones sit among thousands of minor ones. | Prioritising by impact and construction timing makes coordination meetings useful. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Text similarity | Requirement and design element text. Candidate. | Leakage risk to design against: From a text model. |
| A signal-versus-noise trap in this use case: Link | The true signal is confirmed trace links; the common noise is text similarity. | Similar text may not mean satisfaction. |

**Ask the experts**

- [ ] What exactly does "Links proposed and confirmed by engineers" mean in practice for requirements traceability assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Text similarity" and "Existing trace links", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Untraced requirements" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: similarity as compliance, and who can confirm the cut-off times and splits?
- [ ] How often does "Vague requirement" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Non-conformance | Work that does not meet requirements. |
| Drawing revision | A numbered version of a drawing. |
| Specification | A written description of required materials and workmanship. |
| Finite element analysis | A numerical method for stress and heat analysis. |
| Engineer of record | The licensed engineer responsible for a design. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
