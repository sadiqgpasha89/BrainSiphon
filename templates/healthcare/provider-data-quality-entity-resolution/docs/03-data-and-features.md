# Provider Data Quality & Entity Resolution: data and feature specification

> Generated from the blueprint `healthcare/provider-data-quality-entity-resolution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Data Quality & Entity Resolution · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Data Quality & Entity Resolution": Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on random pairs instead of hard near-duplicates.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Identifier agreement | exact match on strong identifiers with check-digit validation | The strongest evidence of identity | Validate against the authoritative registry |   |   |   |
| Name and alias similarity | phonetic and token similarity with alias tables | Handles spelling and transliteration | Never used alone |   |   |   |
| Affiliation and address overlap | shared facility, address and specialty | Corroborates identity | Dated and weighted by recency |   |   |   |
| Cluster consistency | graph transitivity and conflicting identifiers inside a cluster | Detects bad merges | Computed after clustering |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Identity | Strong identifiers such as national provider ID and licence number | Name similarity | Common names create false merges that corrupt credentials and billing |
| Blocking | Multi-key blocking that keeps recall high | One key | A missed block is a duplicate forever |
| Survivorship | Rules by field and source authority | Last write wins | The most recent value is often the least trusted |
| Review | Steward queue ordered by risk and impact | Automatic merge of everything above a threshold | A false merge is far costlier than a missed one |
| Lineage | Every golden field cites its sources | A single merged record | Stewards must be able to unmerge |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Provider photo or biography text | irrelevant to identity |
| Record creation order | an artefact of systems |
| Source system name alone | not an identity attribute |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Identifier agreement inputs | Provider data governance | Provider master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: validate against the authoritative registry. |
| Name and alias similarity inputs | Medical staff office | Credentialing system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: never used alone. |
| Affiliation and address overlap inputs | Health information management | HR information system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: dated and weighted by recency. |
| Cluster consistency inputs | Provider data governance | EHR provider directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: computed after clustering. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_data_quality_entity_resolution_inputs.v1
owner: provider-data-governance@example.com
system_of_record: Provider master data
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: identifier_agreement, type: double, nullable: false }
    - { name: name_and_alias_similarity, type: double, nullable: false }
    - { name: affiliation_and_address_overlap, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Identifier agreement and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Name and alias similarity against Provider master data
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Identifier agreement, traces back to Provider master data; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE provider_data_quality_entity_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE provider_data_quality_entity_outputs (
  run_id TEXT NOT NULL REFERENCES provider_data_quality_entity_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE provider_data_quality_entity_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE provider_data_quality_entity_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Data Quality & Entity Resolution": Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Identifier agreement | Exact match on strong identifiers with check-digit validation. The strongest evidence of identity. | Leakage risk to design against: Validate against the authoritative registry. |
| A signal-versus-noise trap in this use case: Identity | The true signal is strong identifiers such as national provider ID and licence number; the common noise is name similarity. | Common names create false merges that corrupt credentials and billing. |

**Ask the experts**

- [ ] What exactly does "A merge is never made on fuzzy name similarity alone and needs a strong identifier or steward approval" mean in practice for provider data quality & entity resolution: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Identifier agreement" and "Name and alias similarity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Duplicate provider rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on random pairs instead of hard near-duplicates, and who can confirm the cut-off times and splits?
- [ ] How often does "Two providers with the same name and specialty" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
