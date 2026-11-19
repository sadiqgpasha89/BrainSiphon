# Drug-Drug Interaction & Adverse-Event Prediction: data and feature specification

> Generated from the blueprint `healthcare/drug-drug-interaction-and-adverse-event-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Drug-Drug Interaction & Adverse-Event Prediction · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Drug-Drug Interaction & Adverse-Event Prediction": Warn prescribers of clinically significant interactions and predicted adverse events in real time while minimising alert fatigue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Held-out pairs share drugs with train pairs.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Interaction knowledge-graph embedding | link-prediction score between drugs | Novel interactions | Training on known pairs only |   |   |   |
| Renal and hepatic function context | eGFR and liver labs | Dose-related risk | Latest result before order |   |   |   |
| Polypharmacy count | number of concurrent active meds | Risk multiplier | Active medication list |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Patient-specific risk (renal function, age, co-meds) | Generic pairwise interaction lists | Most generic alerts are overridden as irrelevant |
| Severity | Severity-tiered alerting | All interactions equal | Alert fatigue buries critical warnings |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Prescriber specialty alone | not mechanism |
| Order entry time | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Interaction knowledge-graph embedding inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: training on known pairs only. |
| Renal and hepatic function context inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: latest result before order. |
| Polypharmacy count inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: active medication list. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: drug_drug_interaction_and_adverse_event_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: interaction_knowledge_graph_embedding, type: double, nullable: false }
    - { name: renal_and_hepatic_function_context, type: double, nullable: false }
    - { name: polypharmacy_count, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Interaction knowledge-graph embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Renal and hepatic function context against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Interaction knowledge-graph embedding, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Therapeutics Data Commons | https://tdcommons.ai/ | Per-dataset terms (see the site) | Curated datasets across drug discovery tasks, including drug-drug interaction and ADMET | Heterogeneous quality; read each dataset's notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MoleculeNet | https://deepchem.readthedocs.io/en/latest/api_reference/moleculenet.html | MIT licence (see the site) | A benchmark collection of molecular property datasets (toxicity, solubility, binding) | Benchmark splits can be optimistic; use scaffold splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE drug_drug_interaction_and_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  interaction_knowledge_graph_embedding DOUBLE PRECISION,
  renal_and_hepatic_function_context DOUBLE PRECISION,
  polypharmacy_count                 DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE drug_drug_interaction_and_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE drug_drug_interaction_and_labels (
  decision_id    UUID        NOT NULL REFERENCES drug_drug_interaction_and_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Drug-Drug Interaction & Adverse-Event Prediction": Warn prescribers of clinically significant interactions and predicted adverse events in real time while minimising alert fatigue. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Drug discovery and genomics | Early discovery predicts molecular properties, binding and toxicity; genomics predicts the effect of variants and risk from many small genetic effects. Data are small, assays noisy, and the cost of a wrong prediction is a failed experiment, so uncertainty estimates matter. | Random splits are overly optimistic; scaffold or lineage splits show how a model generalises to new chemistry or populations. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Interaction knowledge-graph embedding | Link-prediction score between drugs. Novel interactions. | Leakage risk to design against: Training on known pairs only. |
| A signal-versus-noise trap in this use case: Context | The true signal is patient-specific risk (renal function, age, co-meds); the common noise is generic pairwise interaction lists. | Most generic alerts are overridden as irrelevant. |

**Ask the experts**

- [ ] What exactly does "30 ms in the order-entry flow" mean in practice for drug-drug interaction & adverse-event prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Interaction knowledge-graph embedding" and "Renal and hepatic function context", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Preventable adverse drug events" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: held-out pairs share drugs with train pairs, and who can confirm the cut-off times and splits?
- [ ] How often does "New drug approvals" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| ADMET | Absorption, distribution, metabolism, excretion and toxicity: properties that decide whether a molecule can be a drug. |
| Docking | Simulating how a molecule fits into a protein's binding site to estimate binding strength. |
| Blood culture | A lab test that grows bacteria from a blood sample; taken when infection is suspected and results take days. |
| FHIR / HL7 | Standards for exchanging health data between systems; the alert pipeline typically consumes FHIR or HL7 messages. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Medication adherence | Whether patients take medicines as prescribed. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
