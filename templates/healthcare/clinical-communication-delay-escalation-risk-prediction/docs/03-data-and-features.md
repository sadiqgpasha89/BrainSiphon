# Clinical Communication Delay & Escalation Risk Prediction: data and feature specification

> Generated from the blueprint `healthcare/clinical-communication-delay-escalation-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Communication Delay & Escalation Risk Prediction · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Clinical Communication Delay & Escalation Risk Prediction": Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the score replace urgent timers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Queue depth and arrival rate | open messages and recent arrivals in the target queue | Direct load signal | Event stream |   |   |   |
| Role availability | on-shift staff in the target role | Capacity to respond | Roster snapshot |   |   |   |
| Urgency and channel | category and channel of the message | Different response norms | Message metadata |   |   |   |
| Recent response times | trailing response times for the role and queue | Baseline for the estimate | Earlier periods |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Overrides | Deterministic urgent timers above the model | Model-controlled escalation | An urgent message cannot wait for a score |
| Outcome | Time to acknowledgement with censoring | Binary late flag | Many messages are still open at scoring |
| Unit | Queue and role level risk | Individual staff scores | The aim is flow not performance review |
| Alerts | Rate-limited trigger with reasons | Every high score | Alert fatigue hides real delays |
| Timing | Predicted time to response | Late flag after the breach | The value is early warning |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Message length | not delay |
| Sender identity | not a delay driver |
| Message wording alone | covered by urgency |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Queue depth and arrival rate inputs | Clinical operations | Secure messaging platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: event stream. |
| Role availability inputs | Nursing leadership | Queue and workload data | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: roster snapshot. |
| Urgency and channel inputs | Clinical informatics | Role availability and roster | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: message metadata. |
| Recent response times inputs | Patient safety | Service-level definitions | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: earlier periods. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: clinical_communication_delay_escalation_inputs.v1
owner: clinical-operations@example.com
system_of_record: Secure messaging platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: queue_depth_and_arrival_rate, type: double, nullable: false }
    - { name: role_availability, type: double, nullable: false }
    - { name: urgency_and_channel, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Queue depth and arrival rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Role availability against Secure messaging platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Queue depth and arrival rate, traces back to Secure messaging platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| eICU Collaborative Research Database | https://physionet.org/content/eicu-crd/2.0/ | PhysioNet Credentialed Health Data License; credentialing required | ICU stays from many US hospitals, for cross-site testing | Credentialed access; coding differs by hospital. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE clinical_communication_delay_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  queue_depth_and_arrival_rate       DOUBLE PRECISION,
  role_availability                  DOUBLE PRECISION,
  urgency_and_channel                DOUBLE PRECISION,
  recent_response_times              DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE clinical_communication_delay_decisions (
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
CREATE TABLE clinical_communication_delay_labels (
  decision_id    UUID        NOT NULL REFERENCES clinical_communication_delay_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Clinical Communication Delay & Escalation Risk Prediction": Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Queue depth and arrival rate | Open messages and recent arrivals in the target queue. Direct load signal. | Leakage risk to design against: Event stream. |
| A signal-versus-noise trap in this use case: Overrides | The true signal is deterministic urgent timers above the model; the common noise is model-controlled escalation. | An urgent message cannot wait for a score. |

**Ask the experts**

- [ ] What exactly does "Urgent messages follow deterministic escalation timers and the model can only add earlier escalation" mean in practice for clinical communication delay & escalation risk prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Queue depth and arrival rate" and "Role availability", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Messages meeting their service level" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting the score replace urgent timers, and who can confirm the cut-off times and splits?
- [ ] How often does "Shift change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Censoring | Excluding or stopping observation of a patient after an event, here the hours at or after onset, so the model does not learn from treated patients. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Level shift | An abrupt, lasting change in a series' average. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
