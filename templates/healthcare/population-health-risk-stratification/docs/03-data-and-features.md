# Population Health Risk Stratification: data and feature specification

> Generated from the blueprint `healthcare/population-health-risk-stratification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Population Health Risk Stratification · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Population Health Risk Stratification": Stratify a health plan population by future cost and avoidable utilisation to target care management where it changes outcomes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using cost as proxy for need.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Chronic condition burden | count and severity of conditions | Need | Diagnoses by claim date |   |   |   |
| Prior-year utilisation | ED visits and admissions | Utilisation pattern | Window before target |   |   |   |
| Social-risk indicators | housing, food insecurity screens | Drivers of avoidable events | Consent and accuracy |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Predict avoidable utilisation or clinical need | Predict cost only | Cost-based labels under-identify groups with less access |
| Targeting | Expected program benefit | Highest predicted risk | The sickest patients may not benefit from outreach |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Prior-year total spend | encodes access disparities |
| Plan ID | admin |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Chronic condition burden inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: diagnoses by claim date. |
| Prior-year utilisation inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window before target. |
| Social-risk indicators inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: consent and accuracy. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: population_health_risk_stratification_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: chronic_condition_burden, type: double, nullable: false }
    - { name: prior_year_utilisation, type: double, nullable: false }
    - { name: social_risk_indicators, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Chronic condition burden and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Prior-year utilisation against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Chronic condition burden, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Diabetes 130-US Hospitals (UCI) | https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008 | CC BY 4.0 (see the UCI page) | 100K inpatient encounters with a 30-day readmission outcome | Old data and coarse features. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Heart Disease | https://archive.ics.uci.edu/dataset/45/heart+disease | CC BY 4.0 (see the UCI page) | Small clinical dataset with a heart-disease label | Tiny; use only to test pipeline and calibration code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE population_health_risk_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE population_health_risk_outputs (
  run_id TEXT NOT NULL REFERENCES population_health_risk_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE population_health_risk_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE population_health_risk_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Population Health Risk Stratification": Stratify a health plan population by future cost and avoidable utilisation to target care management where it changes outcomes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Chronic condition burden | Count and severity of conditions. Need. | Leakage risk to design against: Diagnoses by claim date. |
| A signal-versus-noise trap in this use case: Label | The true signal is predict avoidable utilisation or clinical need; the common noise is predict cost only. | Cost-based labels under-identify groups with less access. |

**Ask the experts**

- [ ] What exactly does "Avoid cost-based bias against underserved groups" mean in practice for population health risk stratification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Chronic condition burden" and "Prior-year utilisation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Avoidable admissions in programme vs control" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using cost as proxy for need, and who can confirm the cut-off times and splits?
- [ ] How often does "Coding intensity differs across providers" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Care management | Programmes that give extra support to high-risk patients, which risk models are used to target. |
| HCC | Hierarchical condition category: a risk-adjustment grouping of diagnoses that determines payments. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
