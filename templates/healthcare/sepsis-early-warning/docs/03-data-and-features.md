# Sepsis Early-Warning System: data and feature specification

> Generated from the blueprint `healthcare/sepsis-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sepsis Early-Warning System · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Sepsis Early-Warning System": Alert clinicians hours before sepsis onset from streaming vitals and labs, with alert burden low enough that nurses keep trusting it. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels set after the intervention are partly caused by it.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lactate and trend | latest lactate and 6h slope | A marker of poor tissue perfusion that rises before blood pressure falls | Use result time not draw time |   |   |   |
| Missingness pattern | counts of vitals measured in last 4h | Clinicians measure more when worried | Treat as signal only if the process is stable across sites |   |   |   |
| SIRS and qSOFA drift | change in composite score over 3h | Shows whether the patient is getting worse, not just whether they are abnormal | Compute from charted times |   |   |   |
| Vital-sign slope 3h | change in heart rate, respiratory rate and systolic pressure over 3 hours | Trajectory separates deterioration from a stable abnormal baseline | Use charted times and carry values forward only from past readings |   |   |   |
| Reading density 4h | number of vitals charted in the last 4 hours | Clinicians chart more often when they are worried | Charting habits differ between wards, so check stability per site before trusting it |   |   |   |
| Clinician order frequency | count and timing of lactate orders and blood-culture draws | A clinician orders a lactate because they already suspect sepsis, so the model predicts the doctor and not the patient | High-risk proxy leakage: exclude it, or use it only as a missed-escalation safety net and report results with and without it |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Onset defined by Sepsis-3 criteria with clinician-adjudicated times | Billing-code sepsis labels | Billing codes lag and misplace onset by hours |
| Metric | Lead time at fixed alert burden | AUROC over all hours | Late alerts carry no clinical value yet inflate AUROC |
| Split | Patient-level splits with whole stays held out | Random row splits across hours of the same stay | Hours from one patient land in both train and test and inflate every metric |
| Burden | Alerts per 100 patient-days agreed with nursing leadership | Optimising AUROC and shipping whatever threshold falls out | A model that fires every shift is switched off within a week |
| Alerting | Episode-level state machine: an acknowledged alert enters a 4 to 6 hour refractory window unless the SOFA or NEWS2 trajectory rises past a critical delta | Scoring each 15-minute window independently | Repeat alerts for one patient inflate burden and teach nurses to ignore the system |
| Intervention | Patients treated early after an alert are handled as censored or counterfactual at retraining | Calling patients who got early antibiotics and avoided shock false positives | The model is punished for working and drifts toward silence |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Admission diagnosis text | encodes clinician suspicion that already knows the label |
| Antibiotic orders | order placed after suspicion leaks the label |
| Length of stay so far | longer stays correlate with sepsis only because sicker patients stay longer |
| Lactate and blood-culture order counts or timestamps | proxy for clinician suspicion that inflates offline AUROC without adding early warning |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lactate and trend inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: use result time not draw time. |
| Missingness pattern inputs | Hospital data office | Laboratory information system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: treat as signal only if the process is stable across sites. |
| SIRS and qSOFA drift inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: compute from charted times. |
| Vital-sign slope 3h inputs | Clinical informatics | Care-team and clinical identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use charted times and carry values forward only from past readings. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sepsis_early_warning_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lactate_and_trend, type: double, nullable: false }
    - { name: missingness_pattern, type: double, nullable: false }
    - { name: sirs_and_qsofa_drift, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Lactate and trend and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Missingness pattern against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lactate and trend, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | Open access under the Creative Commons Attribution 4.0 licence | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients from two hospital systems, built for exactly this task, with the official utility score for comparison | Labels are derived with Sepsis-3 rules on charted data, not clinician-adjudicated, and the two hospital systems differ in sampling; test on a different system than you train on |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; requires CITI training and a signed data use agreement | De-identified records of hospital and ICU stays at one US medical centre, with chart times, lab draw and result times and medication orders | Single-centre data; antibiotic orders and diagnoses carry the label, so build features from raw vitals and labs and keep the order-time columns out |
| eICU Collaborative Research Database | https://physionet.org/content/eicu-crd/2.0/ | PhysioNet Credentialed Health Data License; credentialed access required | ICU stays from many US hospitals, which is what you need to test across sites rather than within one | Hospital coding and charting differ widely between sites; check feature distributions per hospital before pooling |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE sepsis_early_warning_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  lactate_and_trend                  DOUBLE PRECISION,
  missingness_pattern                DOUBLE PRECISION,
  sirs_and_qsofa_drift               DOUBLE PRECISION,
  vital_sign_slope_3h                DOUBLE PRECISION,
  reading_density_4h                 DOUBLE PRECISION,
  clinician_order_frequency          DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE sepsis_early_warning_decisions (
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
CREATE TABLE sepsis_early_warning_labels (
  decision_id    UUID        NOT NULL REFERENCES sepsis_early_warning_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Definitions: Sepsis-3, SIRS and qSOFA | Sepsis-3 defines sepsis as suspected infection plus an acute rise of 2 or more points in the SOFA organ-failure score, and septic shock as sepsis that needs vasopressors to keep blood pressure up and has lactate above 2 mmol/L despite fluids. Older screening tools are still used: SIRS (two of abnormal temperature, heart rate, breathing rate or white cell count) and qSOFA (fast breathing, low systolic pressure, altered mentation). | Which definition you label with changes prevalence, onset time and what the model learns, so pick it with clinicians and write it down. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Regulation and data protection | Software that drives clinical decisions can count as a medical device (software as a medical device), with change control for each model update. Patient data is protected by laws such as HIPAA in the United States and the GDPR in Europe, and research datasets are de-identified. | You cannot retrain and redeploy freely; plan validation evidence, monitoring and a change-control record from the start. |

**Ask the experts**

- [ ] How does this hospital define sepsis onset for quality reporting, and which definition should the model's label follow?
- [ ] Who receives the alert, what must they do within what time, and how is their response recorded?
- [ ] What alert burden per unit would clinical leadership accept, and what override rate has made past alerts fail?
- [ ] Which vitals and labs are charted at what cadence, and how long do results typically take to appear in the record?
- [ ] What validation, change-control and privacy approvals do we need before a model can run on live patients?

**Glossary**

| Term | Definition |
|---|---|
| Sepsis | Life-threatening organ dysfunction caused by a dysregulated response to infection. |
| SOFA | Sequential Organ Failure Assessment, a score from 0 to 24 summarising the function of six organ systems; a rise of 2 or more signals sepsis. |
| qSOFA | A bedside screen scoring breathing rate of 22 or more, systolic pressure of 100 or less and altered mentation. |
| SIRS | Systemic inflammatory response syndrome: two or more of abnormal temperature, heart rate above 90, breathing rate above 20 or abnormal white cell count. |
| MAP | Mean arterial pressure, the average blood pressure during a heartbeat cycle; below 65 mmHg suggests poor organ perfusion. |
| Lactate | A blood marker of tissue oxygen shortage; above 2 mmol/L is abnormal and above 4 mmol/L is serious. |
| Vasopressor | A drug such as norepinephrine that raises blood pressure, used in septic shock. |
| Septic shock | Sepsis with persistent low blood pressure needing vasopressors and raised lactate despite fluids, with high mortality. |
| Blood culture | A lab test that grows bacteria from a blood sample; taken when infection is suspected and results take days. |
| Bundle (SEP-1) | A checklist of timed care steps for suspected sepsis, such as lactate, cultures, antibiotics and fluids. |
| GCS | Glasgow Coma Scale, a 3 to 15 score for level of consciousness used in SOFA and qSOFA. |
| Vital signs | Routine measurements of heart rate, blood pressure, breathing rate, temperature and oxygen saturation. |
| EHR | Electronic health record, the hospital system that stores charts, orders, results and where alerts are shown. |
| FHIR / HL7 | Standards for exchanging health data between systems; the alert pipeline typically consumes FHIR or HL7 messages. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| PPV | Positive predictive value: the share of alerts that turn out to be true cases. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Censoring | Excluding or stopping observation of a patient after an event, here the hours at or after onset, so the model does not learn from treated patients. |
| MIMIC | A de-identified intensive-care database from one US hospital used widely for research, available after credentialing. |
| SaMD | Software as a medical device: software with a medical purpose that regulators may require to be validated and change-controlled. |
