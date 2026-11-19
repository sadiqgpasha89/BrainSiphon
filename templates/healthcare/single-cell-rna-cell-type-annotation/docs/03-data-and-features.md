# Single-Cell RNA Cell-Type Annotation: data and feature specification

> Generated from the blueprint `healthcare/single-cell-rna-cell-type-annotation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Single-Cell RNA Cell-Type Annotation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Single-Cell RNA Cell-Type Annotation": Annotate millions of cells with cell types automatically, flagging novel populations for biologists. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test batches seen in training.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Highly variable gene set | selected by dispersion across batches | Signal genes | Fix set at training |   |   |   |
| Latent embedding from scVI-like model | batch-corrected embedding | Annotation space | Seed variance |   |   |   |
| Marker gene scores | known marker panel scores | Interpretability | Curated list version |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Batch | Batch-corrected latent space | Raw expression PCA | Batch effects dominate raw PCA clusters |
| Novelty | Open-set annotation with abstention | Forced classification into known types | New states are forced into wrong labels |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Total UMI count | technical depth |
| Mitochondrial fraction alone | quality not type |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Highly variable gene set inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: fix set at training. |
| Latent embedding from scVI-like model inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: seed variance. |
| Marker gene scores inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: curated list version. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: single_cell_rna_cell_type_annotation_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: highly_variable_gene_set, type: double, nullable: false }
    - { name: latent_embedding_from_scvi_like_model, type: double, nullable: false }
    - { name: marker_gene_scores, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Highly variable gene set and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Latent embedding from scVI-like model against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Highly variable gene set, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE single_cell_rna_cell_type_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE single_cell_rna_cell_type_outputs (
  run_id TEXT NOT NULL REFERENCES single_cell_rna_cell_type_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE single_cell_rna_cell_type_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE single_cell_rna_cell_type_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Single-Cell RNA Cell-Type Annotation": Annotate millions of cells with cell types automatically, flagging novel populations for biologists. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Drug discovery and genomics | Early discovery predicts molecular properties, binding and toxicity; genomics predicts the effect of variants and risk from many small genetic effects. Data are small, assays noisy, and the cost of a wrong prediction is a failed experiment, so uncertainty estimates matter. | Random splits are overly optimistic; scaffold or lineage splits show how a model generalises to new chemistry or populations. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Highly variable gene set | Selected by dispersion across batches. Signal genes. | Leakage risk to design against: Fix set at training. |
| A signal-versus-noise trap in this use case: Batch | The true signal is batch-corrected latent space; the common noise is raw expression PCA. | Batch effects dominate raw PCA clusters. |

**Ask the experts**

- [ ] What exactly does "Batch effects across labs" mean in practice for single-cell rna cell-type annotation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Highly variable gene set" and "Latent embedding from scVI-like model", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Annotation time per dataset" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test batches seen in training, and who can confirm the cut-off times and splits?
- [ ] How often does "New tissue not in reference" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Single-cell RNA sequencing | A technique that measures gene activity in individual cells, used to identify cell types. |
| HCC | Hierarchical condition category: a risk-adjustment grouping of diagnoses that determines payments. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Care management | Programmes that give extra support to high-risk patients, which risk models are used to target. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| Personalised PageRank | PageRank that restarts from chosen seed nodes, used to spread risk from known bad nodes. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
