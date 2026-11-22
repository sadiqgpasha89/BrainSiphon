# Provider Data Reconciliation Across Payer Systems: data and feature specification

> Generated from the blueprint `healthcare/provider-data-reconciliation-across-payer-systems` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Data Reconciliation Across Payer Systems · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Data Reconciliation Across Payer Systems": Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Auto-merging fuzzy matches.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Identifier agreement | agreement of NPIs and other identifiers across records | Strongest link evidence | Source records |   |   |   |
| Attribute similarity | similarity of name, address, specialty and affiliation | Candidate evidence | Normalised fields |   |   |   |
| Graph consistency | whether linked records form a consistent cluster | Flags transitive errors | Cluster at scoring |   |   |   |
| Source authority and freshness | authority tier and age of each source | Drives survivorship | Source register |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Identifiers | Shared identifiers matched first | Name similarity | Names collide and change |
| Matching | Fuzzy matches above a threshold reviewed | Auto-merge | A wrong merge mixes two providers |
| Survivorship | Explicit rules for each field | Latest value wins | Authority differs by field and source |
| History | Effective-dated values kept | Overwrite | Contract and credential dates matter |
| Authority | Steward approves merges | Automatic merge | A merge changes payment and directory outcomes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Record creation order | artefact |
| System identifier format | label |
| Practice marketing text | not identity |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Identifier agreement inputs | Provider data management | Payer provider master | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: source records. |
| Attribute similarity inputs | Network management | Credentialing system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: normalised fields. |
| Graph consistency inputs | Credentialing | Claims system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: cluster at scoring. |
| Source authority and freshness inputs | Compliance | Provider directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: source register. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_data_reconciliation_across_inputs.v1
owner: provider-data-management@example.com
system_of_record: Payer provider master
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: identifier_agreement, type: double, nullable: false }
    - { name: attribute_similarity, type: double, nullable: false }
    - { name: graph_consistency, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Identifier agreement and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Attribute similarity against Payer provider master
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Identifier agreement, traces back to Payer provider master; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE provider_data_reconciliation_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE provider_data_reconciliation_outputs (
  run_id TEXT NOT NULL REFERENCES provider_data_reconciliation_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE provider_data_reconciliation_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE provider_data_reconciliation_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Data Reconciliation Across Payer Systems": Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Identifier agreement | Agreement of NPIs and other identifiers across records. Strongest link evidence. | Leakage risk to design against: Source records. |
| A signal-versus-noise trap in this use case: Identifiers | The true signal is shared identifiers matched first; the common noise is name similarity. | Names collide and change. |

**Ask the experts**

- [ ] What exactly does "The data steward approves merges and authoritative-field rules and the tool never merges records or writes to a source system on its own" mean in practice for provider data reconciliation across payer systems: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Identifier agreement" and "Attribute similarity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Share of records reconciled without manual work" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: auto-merging fuzzy matches, and who can confirm the cut-off times and splits?
- [ ] How often does "Shared practice address" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cohort | A defined group of patients used for a study or for matching to trials. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
