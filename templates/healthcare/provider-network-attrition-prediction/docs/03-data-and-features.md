# Provider Network Attrition Prediction: data and feature specification

> Generated from the blueprint `healthcare/provider-network-attrition-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Attrition Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Network Attrition Prediction": Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using the score in payment or contracting decisions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Contract end proximity | time to the contract end or renewal date | Strongest timing signal | Contract records |   |   |   |
| Participation trend | change in claims volume or panel size | Early sign of reduced participation | Earlier periods |   |   |   |
| Service issue history | unresolved issues and escalations | Dissatisfaction signal | Issue log |   |   |   |
| Network role | criticality of the provider to access in the area | Prioritises outreach | Network rules |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Outcome | Departure or participation drop with censoring | Binary left flag | Many providers are still active |
| Use | Retention outreach and continuity planning | Contract or payment decisions | A risk score must not penalise providers |
| Drivers | Operational drivers such as contract timing and service issues | Opaque features | Network staff need actionable reasons |
| Fairness | Group performance reviewed | Aggregate accuracy only | A model can fail some provider groups |
| Privacy | Licensed and lawful data only | Any available data | Data rights and privacy rules apply |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Provider name | label |
| Contract identifier | label |
| Specialty marketing | not signal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Contract end proximity inputs | Network management | Network contracting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract records. |
| Participation trend inputs | Provider relations | Provider participation records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: earlier periods. |
| Service issue history inputs | Contracting | Claims and utilisation warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: issue log. |
| Network role inputs | Compliance | Provider service and issue log | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: network rules. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_network_attrition_prediction_inputs.v1
owner: network-management@example.com
system_of_record: Network contracting system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: contract_end_proximity, type: double, nullable: false }
    - { name: participation_trend, type: double, nullable: false }
    - { name: service_issue_history, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Contract end proximity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Participation trend against Network contracting system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Contract end proximity, traces back to Network contracting system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Predict Students' Dropout and Academic Success | https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success | CC BY 4.0 (see the UCI page) | 4,400 students with enrolment and early-performance features and a dropout label | One institution; small. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE provider_network_attrition_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE provider_network_attrition_outputs (
  run_id TEXT NOT NULL REFERENCES provider_network_attrition_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE provider_network_attrition_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE provider_network_attrition_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Network Attrition Prediction": Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Contract end proximity | Time to the contract end or renewal date. Strongest timing signal. | Leakage risk to design against: Contract records. |
| A signal-versus-noise trap in this use case: Outcome | The true signal is departure or participation drop with censoring; the common noise is binary left flag. | Many providers are still active. |

**Ask the experts**

- [ ] What exactly does "No punitive action follows from a score and the output is used only for legitimate network planning and outreach" mean in practice for provider network attrition prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Contract end proximity" and "Participation trend", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Departures avoided or planned for" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using the score in payment or contracting decisions, and who can confirm the cut-off times and splits?
- [ ] How often does "Merger of provider groups" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Censoring | Excluding or stopping observation of a patient after an event, here the hours at or after onset, so the model does not learn from treated patients. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Stationarity | A series whose statistical properties do not change over time. |
| Lag feature | A past value of the series used as a predictor. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
