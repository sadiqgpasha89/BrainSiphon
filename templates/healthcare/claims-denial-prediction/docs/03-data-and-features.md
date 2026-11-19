# Claims Denial Prediction & Prevention: data and feature specification

> Generated from the blueprint `healthcare/claims-denial-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Claims Denial Prediction & Prevention · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Claims Denial Prediction & Prevention": Predict which claims will be denied before submission and fix root causes (coding, eligibility, documentation) to raise clean-claim rate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Mature labels only after 60 days.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Payer-code historical denial rate | denial rate for payer and procedure code | Payer behaviour | Matured claims |   |   |   |
| Eligibility verification state | eligibility check result recency | Common denial | Verified before submission |   |   |   |
| Documentation completeness | required attachments present | Rule compliance | Checklist |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Root cause | Predict denial reason categories | Binary denial flag | Different reasons need different fixes |
| Payer | Payer-specific models or interactions | One global model | Each payer has distinct adjudication rules |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Biller ID | personal habits |
| Claim line order | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Payer-code historical denial rate inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: matured claims. |
| Eligibility verification state inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: verified before submission. |
| Documentation completeness inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: checklist. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: claims_denial_prediction_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: payer_code_historical_denial_rate, type: double, nullable: false }
    - { name: eligibility_verification_state, type: double, nullable: false }
    - { name: documentation_completeness, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Payer-code historical denial rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Eligibility verification state against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Payer-code historical denial rate, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Diabetes 130-US Hospitals (UCI) | https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008 | CC BY 4.0 (see the UCI page) | 100K inpatient encounters with a 30-day readmission outcome | Old data and coarse features. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE claims_denial_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE claims_denial_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES claims_denial_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE claims_denial_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE claims_denial_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Claims Denial Prediction & Prevention": Predict which claims will be denied before submission and fix root causes (coding, eligibility, documentation) to raise clean-claim rate. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Payer-code historical denial rate | Denial rate for payer and procedure code. Payer behaviour. | Leakage risk to design against: Matured claims. |
| A signal-versus-noise trap in this use case: Root cause | The true signal is predict denial reason categories; the common noise is binary denial flag. | Different reasons need different fixes. |

**Ask the experts**

- [ ] What exactly does "Payer-specific rules" mean in practice for claims denial prediction & prevention: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Payer-code historical denial rate" and "Eligibility verification state", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Clean claim rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: mature labels only after 60 days, and who can confirm the cut-off times and splits?
- [ ] How often does "Payer silently changes policy" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| HCC | Hierarchical condition category: a risk-adjustment grouping of diagnoses that determines payments. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
