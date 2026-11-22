# Corrective Action & CAPA Effectiveness Prediction: data and feature specification

> Generated from the blueprint `healthcare/corrective-action-capa-effectiveness-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corrective Action & CAPA Effectiveness Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Corrective Action & CAPA Effectiveness Prediction": Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating closure as effectiveness.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Action strength | classification on an action-strength hierarchy | Stronger system fixes work better | From the plan |   |   |   |
| Implementation evidence | evidence type and date relative to the due date | Shows the action is real | As at scoring |   |   |   |
| Pre-action event rate | events per month before the action | Baseline for recurrence | Window before the action date |   |   |   |
| Owner load | open actions per owner | Overloaded owners miss follow-through | Counts as at scoring |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Effect | Recurrence after the action with a comparison period | Closure of the action | A closed action is not an effective action |
| Outcome | Time to recurrence with censoring | Binary recurred or not | Short follow-up hides recurrences |
| Rules | Overdue and missing-evidence checks by rule | Predictive score for deadlines | Deadlines are facts |
| Causality | Recurrence-risk signal with stated limits | Claim that the action caused the change | Regression to the mean looks like improvement |
| Quality | Action strength using a standard hierarchy | Count of actions | Education alone is a weak action |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Action text length | style |
| Owner seniority | not a cause of effectiveness |
| Meeting where the action was agreed | context not mechanism |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Action strength inputs | Quality and patient safety | Quality management and CAPA system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the plan. |
| Implementation evidence inputs | Risk management | Incident reporting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: as at scoring. |
| Pre-action event rate inputs | Action owners | Action-tracking and audit system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window before the action date. |
| Owner load inputs | Compliance | Quality management and CAPA system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: counts as at scoring. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: corrective_action_capa_effectiveness_inputs.v1
owner: quality-and-patient-safety@example.com
system_of_record: Quality management and CAPA system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: action_strength, type: double, nullable: false }
    - { name: implementation_evidence, type: double, nullable: false }
    - { name: pre_action_event_rate, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Action strength and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Implementation evidence against Quality management and CAPA system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Action strength, traces back to Quality management and CAPA system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
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
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE corrective_action_capa_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE corrective_action_capa_outputs (
  run_id TEXT NOT NULL REFERENCES corrective_action_capa_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE corrective_action_capa_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE corrective_action_capa_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Corrective Action & CAPA Effectiveness Prediction": Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Action strength | Classification on an action-strength hierarchy. Stronger system fixes work better. | Leakage risk to design against: From the plan. |
| A signal-versus-noise trap in this use case: Effect | The true signal is recurrence after the action with a comparison period; the common noise is closure of the action. | A closed action is not an effective action. |

**Ask the experts**

- [ ] What exactly does "The safety or quality committee approves every CAPA closure" mean in practice for corrective action & capa effectiveness prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Action strength" and "Implementation evidence", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Recurrence rate of addressed patterns" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating closure as effectiveness, and who can confirm the cut-off times and splits?
- [ ] How often does "Concurrent changes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Censoring | Excluding or stopping observation of a patient after an event, here the hours at or after onset, so the model does not learn from treated patients. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Wearable | A body-worn sensor, such as a watch, that records heart rate, movement or sleep. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Remaining useful life | The estimated time before a machine or component fails. |
