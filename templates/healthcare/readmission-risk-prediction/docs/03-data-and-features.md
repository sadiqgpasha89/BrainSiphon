# 30-Day Readmission Risk Prediction: data and feature specification

> Generated from the blueprint `healthcare/readmission-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** 30-Day Readmission Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "30-Day Readmission Risk Prediction": Identify discharges at highest risk of 30-day readmission and match them to transitional-care interventions within capacity. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels hide admissions at other hospitals.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Prior-year admissions | count of admissions in prior 12 months | Strongest predictor | Exclude the index stay |   |   |   |
| Discharge summary risk phrases | NLP-extracted unresolved issues | Context in notes | Only notes signed before discharge |   |   |   |
| Follow-up appointment scheduled | appointment within 7 days booked | Modifiable factor | Booked before discharge time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Actionability | Modifiable risk factors (follow-up booking, med reconciliation) | Fixed demographics driving risk | Care teams cannot change age or prior history |
| Targeting | Risk and expected benefit of the intervention | Highest-risk patients only | Some high-risk patients will not benefit |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Insurance plan code alone | proxy for socioeconomic status with fairness risk |
| Discharge weekday | operational artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Prior-year admissions inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: exclude the index stay. |
| Discharge summary risk phrases inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: only notes signed before discharge. |
| Follow-up appointment scheduled inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: booked before discharge time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: readmission_risk_prediction_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: prior_year_admissions, type: double, nullable: false }
    - { name: discharge_summary_risk_phrases, type: double, nullable: false }
    - { name: follow_up_appointment_scheduled, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Prior-year admissions and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Discharge summary risk phrases against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Prior-year admissions, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Diabetes 130-US Hospitals (UCI) | https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008 | CC BY 4.0 (see the UCI page) | 100K inpatient encounters with a 30-day readmission outcome | Old data and coarse features. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE readmission_risk_prediction_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE readmission_risk_prediction_fields (
  document_id TEXT NOT NULL REFERENCES readmission_risk_prediction_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE readmission_risk_prediction_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "30-Day Readmission Risk Prediction": Identify discharges at highest risk of 30-day readmission and match them to transitional-care interventions within capacity. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Prior-year admissions | Count of admissions in prior 12 months. Strongest predictor. | Leakage risk to design against: Exclude the index stay. |
| A signal-versus-noise trap in this use case: Actionability | The true signal is modifiable risk factors (follow-up booking, med reconciliation); the common noise is fixed demographics driving risk. | Care teams cannot change age or prior history. |

**Ask the experts**

- [ ] What exactly does "Fairness across demographics" mean in practice for 30-day readmission risk prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Prior-year admissions" and "Discharge summary risk phrases", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "30-day readmission rate in treated vs control" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels hide admissions at other hospitals, and who can confirm the cut-off times and splits?
- [ ] How often does "Planned readmissions counted as failures" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Readmission | A return to hospital shortly after discharge, usually counted within 30 days and tied to quality penalties. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| FHIR / HL7 | Standards for exchanging health data between systems; the alert pipeline typically consumes FHIR or HL7 messages. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
