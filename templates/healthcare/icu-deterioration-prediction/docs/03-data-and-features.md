# ICU & Ward Deterioration Prediction: data and feature specification

> Generated from the blueprint `healthcare/icu-deterioration-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ICU & Ward Deterioration Prediction · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "ICU & Ward Deterioration Prediction": Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Retrospective labels include interventions caused by model-driven alerts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Vital-sign trend z-scores | deviation of HR, RR, SpO2 from patient baseline | Early instability | Baseline excludes the prediction window |   |   |   |
| Oxygen support escalation | change in FiO2 or device level | Respiratory decline | Charted times |   |   |   |
| Nurse concern flag | structured concern assessment | Human gestalt | Present only if recorded before event |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Horizon | Calibrated risk at multiple horizons (4h, 12h, 24h) | Single binary event within admission | Clinicians need timing to decide on action |
| Context | Care-goal and DNR status aware outcomes | Death anywhere counted equally | Expected deaths under palliative care are not deterioration to prevent |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Total length of stay so far | proxies for severity but biases late |
| Bed number | location artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Vital-sign trend z-scores inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: baseline excludes the prediction window. |
| Oxygen support escalation inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: charted times. |
| Nurse concern flag inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: present only if recorded before event. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: icu_deterioration_prediction_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: vital_sign_trend_z_scores, type: double, nullable: false }
    - { name: oxygen_support_escalation, type: double, nullable: false }
    - { name: nurse_concern_flag, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Vital-sign trend z-scores and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Oxygen support escalation against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Vital-sign trend z-scores, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE icu_deterioration_prediction_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  vital_sign_trend_z_scores          DOUBLE PRECISION,
  oxygen_support_escalation          DOUBLE PRECISION,
  nurse_concern_flag                 DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE icu_deterioration_prediction_decisions (
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
CREATE TABLE icu_deterioration_prediction_labels (
  decision_id    UUID        NOT NULL REFERENCES icu_deterioration_prediction_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "ICU & Ward Deterioration Prediction": Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Vital-sign trend z-scores | Deviation of HR, RR, SpO2 from patient baseline. Early instability. | Leakage risk to design against: Baseline excludes the prediction window. |
| A signal-versus-noise trap in this use case: Horizon | The true signal is calibrated risk at multiple horizons (4h, 12h, 24h); the common noise is single binary event within admission. | Clinicians need timing to decide on action. |

**Ask the experts**

- [ ] What exactly does "Hourly refresh" mean in practice for icu & ward deterioration prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Vital-sign trend z-scores" and "Oxygen support escalation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unplanned ICU transfers" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: retrospective labels include interventions caused by model-driven alerts, and who can confirm the cut-off times and splits?
- [ ] How often does "Sensor disconnects during bathing" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Vital signs | Routine measurements of heart rate, blood pressure, breathing rate, temperature and oxygen saturation. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Sepsis | Life-threatening organ dysfunction caused by a dysregulated response to infection. |
| SOFA | Sequential Organ Failure Assessment, a score from 0 to 24 summarising the function of six organ systems; a rise of 2 or more signals sepsis. |
| qSOFA | A bedside screen scoring breathing rate of 22 or more, systolic pressure of 100 or less and altered mentation. |
| SIRS | Systemic inflammatory response syndrome: two or more of abnormal temperature, heart rate above 90, breathing rate above 20 or abnormal white cell count. |
| MAP | Mean arterial pressure, the average blood pressure during a heartbeat cycle; below 65 mmHg suggests poor organ perfusion. |
| Lactate | A blood marker of tissue oxygen shortage; above 2 mmol/L is abnormal and above 4 mmol/L is serious. |
| Vasopressor | A drug such as norepinephrine that raises blood pressure, used in septic shock. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
