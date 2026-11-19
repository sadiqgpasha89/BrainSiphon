# Healthcare Fraud, Waste & Abuse Detection: data and feature specification

> Generated from the blueprint `healthcare/healthcare-fraud-waste-abuse-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Fraud, Waste & Abuse Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Fraud, Waste & Abuse Detection": Detect upcoding, phantom billing and kickback networks in provider claims to reduce improper payments and focus audits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Positives only from audited providers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| E/M code distribution skew | share of high-level visit codes vs peers | Upcoding | Peer baseline per specialty |   |   |   |
| Impossible services per day | hours of services billed per provider-day | Phantom billing | Time models per code |   |   |   |
| Referral concentration | share of referrals to a single entity | Kickback | Referral graph snapshot |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Peer | Provider behaviour relative to specialty and region peers | Absolute billing volume | Large legitimate practices bill more |
| Network | Referral and billing network structures | Provider-level features only | Kickback rings show only in links |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Patient volume alone | size effect |
| Provider age | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| E/M code distribution skew inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: peer baseline per specialty. |
| Impossible services per day inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: time models per code. |
| Referral concentration inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: referral graph snapshot. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_fraud_waste_abuse_detection_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: e_m_code_distribution_skew, type: double, nullable: false }
    - { name: impossible_services_per_day, type: double, nullable: false }
    - { name: referral_concentration, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on E/M code distribution skew and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Impossible services per day against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as E/M code distribution skew, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Credit Card Fraud Detection (ULB / Worldline) | https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud | Database Contents License (DbCL) v1.0; free Kaggle login | 284,807 European card transactions over two days with 492 frauds; a clean imbalanced benchmark for model and metric code | Features are PCA-anonymised and only 48 hours long: no velocity windows, merchants or label delay. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE healthcare_fraud_waste_abuse_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE healthcare_fraud_waste_abuse_outputs (
  run_id TEXT NOT NULL REFERENCES healthcare_fraud_waste_abuse_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE healthcare_fraud_waste_abuse_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE healthcare_fraud_waste_abuse_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Fraud, Waste & Abuse Detection": Detect upcoding, phantom billing and kickback networks in provider claims to reduce improper payments and focus audits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: E/M code distribution skew | Share of high-level visit codes vs peers. Upcoding. | Leakage risk to design against: Peer baseline per specialty. |
| A signal-versus-noise trap in this use case: Peer | The true signal is provider behaviour relative to specialty and region peers; the common noise is absolute billing volume. | Large legitimate practices bill more. |

**Ask the experts**

- [ ] What exactly does "Due-process for providers" mean in practice for healthcare fraud, waste & abuse detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "E/M code distribution skew" and "Impossible services per day", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Improper payments recovered" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: positives only from audited providers, and who can confirm the cut-off times and splits?
- [ ] How often does "New billing guidance changes code norms" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
