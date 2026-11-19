# Patient No-Show Prediction & Overbooking: data and feature specification

> Generated from the blueprint `healthcare/patient-no-show-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient No-Show Prediction & Overbooking · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Patient No-Show Prediction & Overbooking": Predict appointment no-shows to target reminders and apply safe overbooking that raises utilisation without long waits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ignoring that reminders change outcomes.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Prior no-show history | rate over last 12 months | Behavioural | Excludes the appointment |   |   |   |
| Lead time to appointment | days between booking and visit | Forgetting risk | Booking date |   |   |   |
| Transport and weather disruption | forecast and transit indices | Barrier | Forecast not actual |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Action | Intervene with supportive actions (transport, reminders) | Punitive double-booking by risk | Penalising high-risk patients widens disparities |
| Calibration | Calibrated probabilities for overbooking maths | Rank-only models | Overbooking needs actual probabilities |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Patient zip code alone | socioeconomic proxy |
| Appointment slot ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Prior no-show history inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: excludes the appointment. |
| Lead time to appointment inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: booking date. |
| Transport and weather disruption inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: forecast not actual. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: patient_no_show_prediction_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: prior_no_show_history, type: double, nullable: false }
    - { name: lead_time_to_appointment, type: double, nullable: false }
    - { name: transport_and_weather_disruption, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Prior no-show history and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Lead time to appointment against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Prior no-show history, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE patient_no_show_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE patient_no_show_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES patient_no_show_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE patient_no_show_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE patient_no_show_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Patient No-Show Prediction & Overbooking": Predict appointment no-shows to target reminders and apply safe overbooking that raises utilisation without long waits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Prior no-show history | Rate over last 12 months. Behavioural. | Leakage risk to design against: Excludes the appointment. |
| A signal-versus-noise trap in this use case: Action | The true signal is intervene with supportive actions (transport, reminders); the common noise is punitive double-booking by risk. | Penalising high-risk patients widens disparities. |

**Ask the experts**

- [ ] What exactly does "Equity (do not penalise transport-limited patients)" mean in practice for patient no-show prediction & overbooking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Prior no-show history" and "Lead time to appointment", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "No-show rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: ignoring that reminders change outcomes, and who can confirm the cut-off times and splits?
- [ ] How often does "Public transport strike" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| OR block time | Reserved operating room time given to surgeons or services. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
