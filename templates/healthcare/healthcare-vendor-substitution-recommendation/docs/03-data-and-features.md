# Healthcare Vendor Substitution Recommendation: data and feature specification

> Generated from the blueprint `healthcare/healthcare-vendor-substitution-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Vendor Substitution Recommendation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Vendor Substitution Recommendation": Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using embedding similarity for equivalence.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Approved-equivalence status | status in the clinical equivalence register | Gate for eligibility | Register version |   |   |   |
| Supply risk of the alternative | availability and lead time of the candidate | Practical feasibility | Latest feed |   |   |   |
| Price delta | candidate price relative to current price after tier and contract | Cost impact | Contract status |   |   |   |
| Supplier reliability | performance score of the candidate supplier | Delivery risk | Earlier periods |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Equivalence | Approved equivalence register | Embedding similarity | Similar descriptions can be clinically different |
| Hard gate | Only approved candidates are ranked | Ranked list of everything similar | Unapproved items cannot be used |
| Trade-offs | Price, availability, lead time and risk shown | One score | Buyers weigh them differently by urgency |
| Approval | Request for clinical sign-off | Auto-substitute | A wrong substitution can harm patients |
| Learning | Learn ranking among approved options from accepted decisions | Learn equivalence from history | History contains unapproved emergency swaps |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Brand popularity | not equivalence |
| Catalogue description text | marketing |
| Rep recommendation | commercial interest |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Approved-equivalence status inputs | Materials management | Item master and clinical equivalence register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: register version. |
| Supply risk of the alternative inputs | Clinical value analysis | Procurement system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: latest feed. |
| Price delta inputs | Biomedical engineering | Supplier performance records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract status. |
| Supplier reliability inputs | Procurement | Recall and alert feeds | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: earlier periods. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_vendor_substitution_inputs.v1
owner: materials-management@example.com
system_of_record: Item master and clinical equivalence register
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: approved_equivalence_status, type: double, nullable: false }
    - { name: supply_risk_of_the_alternative, type: double, nullable: false }
    - { name: price_delta, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Approved-equivalence status and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Supply risk of the alternative against Item master and clinical equivalence register
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Approved-equivalence status, traces back to Item master and clinical equivalence register; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MovieLens datasets | https://grouplens.org/datasets/movielens/ | GroupLens research terms (see the page) | Explicit ratings from 100K to 25M with timestamps, the standard recommender benchmark | Explicit ratings are not implicit clicks; film domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Retailrocket recommender system dataset | https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset | CC BY-NC-SA 4.0 (see the dataset page) | About 2.7 million view, add-to-cart and purchase events with item properties | Anonymised ids and no dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon-M2 multilingual shopping sessions | https://arxiv.org/abs/2307.09688 | See the paper for the licence | Anonymised multi-locale shopping sessions with product attributes for next-item prediction | Several locales with different catalogues; evaluate each separately. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE healthcare_vendor_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE healthcare_vendor_outputs (
  run_id TEXT NOT NULL REFERENCES healthcare_vendor_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE healthcare_vendor_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE healthcare_vendor_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Vendor Substitution Recommendation": Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Approved-equivalence status | Status in the clinical equivalence register. Gate for eligibility. | Leakage risk to design against: Register version. |
| A signal-versus-noise trap in this use case: Equivalence | The true signal is approved equivalence register; the common noise is embedding similarity. | Similar descriptions can be clinically different. |

**Ask the experts**

- [ ] What exactly does "Clinical equivalence is a hard gate from the approved register and never a learned similarity score" mean in practice for healthcare vendor substitution recommendation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Approved-equivalence status" and "Supply risk of the alternative", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to resolve a shortage" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using embedding similarity for equivalence, and who can confirm the cut-off times and splits?
- [ ] How often does "No approved alternative" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| Hit rate@K | The share of cases in which the true item appears in the top K. |
| MRR | Mean reciprocal rank: the average of one over the rank of the first relevant item. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
