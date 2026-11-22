# Healthcare Supplier Performance & Risk Scoring: data and feature specification

> Generated from the blueprint `healthcare/healthcare-supplier-performance-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Supplier Performance & Risk Scoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Supplier Performance & Risk Scoring": Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Mixing facts with unverified external signals.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| On-time-in-full rate trend | trailing on-time-in-full against target and its slope | Direct delivery performance | Receipts as logged |   |   |   |
| Quality incident rate | incidents and recalls per volume | Safety signal | Incidents as recorded |   |   |   |
| Single-source exposure | share of critical items with no qualified alternative | Continuity risk | Item qualification tables |   |   |   |
| External risk flags | approved financial and disruption indicators | Adds forward-looking risk | Feed timestamps |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Dimensions | Delivery, quality, continuity and financial risk shown separately | One blended score | A supplier can be reliable but financially fragile |
| Facts | Observed deliveries and incidents | Press sentiment | External noise outweighs facts |
| Criticality | Exposure weighted by clinical criticality of items | Spend weighted | The cheapest item can be life-critical |
| Action | Mitigation options with evidence | Score only | Procurement needs next steps |
| Fairness | Treat small and large suppliers consistently | Volume-biased scores | Small suppliers get unfairly flagged |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Supplier marketing material | not evidence |
| Social media volume | noisy |
| Account manager opinion | unsystematic |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| On-time-in-full rate trend inputs | Supply chain risk | Procurement and supplier management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: receipts as logged. |
| Quality incident rate inputs | Procurement | Receiving and inventory system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: incidents as recorded. |
| Single-source exposure inputs | Clinical value analysis | Quality and recall management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: item qualification tables. |
| External risk flags inputs | Materials management | Supplier master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: feed timestamps. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_supplier_performance_risk_inputs.v1
owner: supply-chain-risk@example.com
system_of_record: Procurement and supplier management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: on_time_in_full_rate_trend, type: double, nullable: false }
    - { name: quality_incident_rate, type: double, nullable: false }
    - { name: single_source_exposure, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on On-time-in-full rate trend and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Quality incident rate against Procurement and supplier management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as On-time-in-full rate trend, traces back to Procurement and supplier management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Heart Disease | https://archive.ics.uci.edu/dataset/45/heart+disease | CC BY 4.0 (see the UCI page) | Small clinical dataset with a heart-disease label | Tiny; use only to test pipeline and calibration code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE healthcare_supplier_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE healthcare_supplier_outputs (
  run_id TEXT NOT NULL REFERENCES healthcare_supplier_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE healthcare_supplier_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE healthcare_supplier_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Supplier Performance & Risk Scoring": Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: On-time-in-full rate trend | Trailing on-time-in-full against target and its slope. Direct delivery performance. | Leakage risk to design against: Receipts as logged. |
| A signal-versus-noise trap in this use case: Dimensions | The true signal is delivery, quality, continuity and financial risk shown separately; the common noise is one blended score. | A supplier can be reliable but financially fragile. |

**Ask the experts**

- [ ] What exactly does "Observed facts and external signals are shown separately" mean in practice for healthcare supplier performance & risk scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "On-time-in-full rate trend" and "Quality incident rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Disruption events avoided or mitigated" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: mixing facts with unverified external signals, and who can confirm the cut-off times and splits?
- [ ] How often does "Supplier merger" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Hierarchical forecasting | Forecasting at several levels (item, category, total) that must add up. |
| Stationarity | A series whose statistical properties do not change over time. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
