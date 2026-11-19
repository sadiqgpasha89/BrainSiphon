# Molecular Property Prediction for Drug Discovery: data and feature specification

> Generated from the blueprint `healthcare/drug-discovery-molecular-property-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Molecular Property Prediction for Drug Discovery · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Molecular Property Prediction for Drug Discovery": Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split leakage.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pretrained molecular graph embedding | GNN encoder pretrained on millions of molecules | Transfer | Check overlap with test scaffolds |   |   |   |
| Physicochemical descriptors | logP, TPSA, MW | Prior knowledge | Calculation tool version |   |   |   |
| Assay noise estimate | replicate variance | Label quality | Use for weighting |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Splits | Scaffold or time splits | Random molecule splits | Random splits leak near-analogues and inflate results |
| Uncertainty | Calibrated uncertainty and applicability domain | Point predictions | Chemists need to know when not to trust the model |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Molecule ID | arbitrary |
| Vendor of compound | batch effect |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pretrained molecular graph embedding inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: check overlap with test scaffolds. |
| Physicochemical descriptors inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calculation tool version. |
| Assay noise estimate inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use for weighting. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: drug_discovery_molecular_property_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pretrained_molecular_graph_embedding, type: double, nullable: false }
    - { name: physicochemical_descriptors, type: double, nullable: false }
    - { name: assay_noise_estimate, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Pretrained molecular graph embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Physicochemical descriptors against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pretrained molecular graph embedding, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MoleculeNet | https://deepchem.readthedocs.io/en/latest/api_reference/moleculenet.html | MIT licence (see the site) | A benchmark collection of molecular property datasets (toxicity, solubility, binding) | Benchmark splits can be optimistic; use scaffold splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Therapeutics Data Commons | https://tdcommons.ai/ | Per-dataset terms (see the site) | Curated datasets across drug discovery tasks, including drug-drug interaction and ADMET | Heterogeneous quality; read each dataset's notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE drug_discovery_molecular_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE drug_discovery_molecular_outputs (
  run_id TEXT NOT NULL REFERENCES drug_discovery_molecular_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE drug_discovery_molecular_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE drug_discovery_molecular_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Molecular Property Prediction for Drug Discovery": Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Drug discovery and genomics | Early discovery predicts molecular properties, binding and toxicity; genomics predicts the effect of variants and risk from many small genetic effects. Data are small, assays noisy, and the cost of a wrong prediction is a failed experiment, so uncertainty estimates matter. | Random splits are overly optimistic; scaffold or lineage splits show how a model generalises to new chemistry or populations. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Graph learning and its pitfalls | Graph neural networks and graph features (degree, centrality, personalised PageRank, motifs) propagate information along edges. Leakage hides in the split: random edge splits put future or neighbouring information into training; time-based and node-based splits are safer. | Evaluate on whole communities or later periods, and compare with simple hand-built graph features before adding a GNN. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Pretrained molecular graph embedding | GNN encoder pretrained on millions of molecules. Transfer. | Leakage risk to design against: Check overlap with test scaffolds. |
| A signal-versus-noise trap in this use case: Splits | The true signal is scaffold or time splits; the common noise is random molecule splits. | Random splits leak near-analogues and inflate results. |

**Ask the experts**

- [ ] What exactly does "Scaffold-split generalisation" mean in practice for molecular property prediction for drug discovery: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pretrained molecular graph embedding" and "Physicochemical descriptors", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Synthesis cycles to hit" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: random split leakage, and who can confirm the cut-off times and splits?
- [ ] How often does "Out-of-domain scaffold" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| ADMET | Absorption, distribution, metabolism, excretion and toxicity: properties that decide whether a molecule can be a drug. |
| Docking | Simulating how a molecule fits into a protein's binding site to estimate binding strength. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Node / edge | The entities in a graph and the relationships between them. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
