# Polygenic Risk Scoring: data and feature specification

> Generated from the blueprint `healthcare/polygenic-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Polygenic Risk Scoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Polygenic Risk Scoring": Combine genome-wide variant effects into calibrated disease risk scores that are valid across ancestries and actionable for prevention programmes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Validating in the same biobank used for GWAS.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Shrunk SNP effect sizes | LDpred2 or PRS-CS posterior effects | Reduces noise | Use external GWAS only |   |   |   |
| Ancestry principal components | genetic PCs for calibration | Population structure | Reference panel version |   |   |   |
| Clinical covariates | age, sex, family history | Combined model | Documented definitions |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Portability | Ancestry-aware training and calibration | Scores trained on European cohorts applied universally | Accuracy drops 2-5x in under-represented ancestries |
| Clinical utility | Absolute risk with net benefit analysis | Relative risk percentiles | Percentiles do not tell if screening is worthwhile |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw p-value thresholded SNP lists | unstable |
| Self-reported ethnicity alone | inaccurate proxy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Shrunk SNP effect sizes inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use external GWAS only. |
| Ancestry principal components inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: reference panel version. |
| Clinical covariates inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: documented definitions. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: polygenic_risk_scoring_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: shrunk_snp_effect_sizes, type: double, nullable: false }
    - { name: ancestry_principal_components, type: double, nullable: false }
    - { name: clinical_covariates, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Shrunk SNP effect sizes and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Ancestry principal components against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Shrunk SNP effect sizes, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Heart Disease | https://archive.ics.uci.edu/dataset/45/heart+disease | CC BY 4.0 (see the UCI page) | Small clinical dataset with a heart-disease label | Tiny; use only to test pipeline and calibration code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE polygenic_risk_scoring_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE polygenic_risk_scoring_outputs (
  run_id TEXT NOT NULL REFERENCES polygenic_risk_scoring_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE polygenic_risk_scoring_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE polygenic_risk_scoring_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Polygenic Risk Scoring": Combine genome-wide variant effects into calibrated disease risk scores that are valid across ancestries and actionable for prevention programmes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Drug discovery and genomics | Early discovery predicts molecular properties, binding and toxicity; genomics predicts the effect of variants and risk from many small genetic effects. Data are small, assays noisy, and the cost of a wrong prediction is a failed experiment, so uncertainty estimates matter. | Random splits are overly optimistic; scaffold or lineage splits show how a model generalises to new chemistry or populations. |
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Shrunk SNP effect sizes | LDpred2 or PRS-CS posterior effects. Reduces noise. | Leakage risk to design against: Use external GWAS only. |
| A signal-versus-noise trap in this use case: Portability | The true signal is ancestry-aware training and calibration; the common noise is scores trained on European cohorts applied universally. | Accuracy drops 2-5x in under-represented ancestries. |

**Ask the experts**

- [ ] What exactly does "Ancestry portability" mean in practice for polygenic risk scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Shrunk SNP effect sizes" and "Ancestry principal components", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Uptake of preventive screening" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: validating in the same biobank used for GWAS, and who can confirm the cut-off times and splits?
- [ ] How often does "Sample overlap between GWAS and target" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Polygenic risk score | A disease risk estimate summed over the small effects of many genetic variants. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| HCC | Hierarchical condition category: a risk-adjustment grouping of diagnoses that determines payments. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| Prevalence | How common a condition is in the population, which determines how useful a positive result is. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
