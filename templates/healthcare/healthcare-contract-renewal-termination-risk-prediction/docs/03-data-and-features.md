# Healthcare Contract Renewal & Termination Risk Prediction: data and feature specification

> Generated from the blueprint `healthcare/healthcare-contract-renewal-termination-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Renewal & Termination Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Contract Renewal & Termination Risk Prediction": Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting dates that the contract states.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Days to notice deadline minus review lead time | remaining time before the latest action date less the usual review cycle | The urgency measure | Rule-computed |   |   |   |
| Spend and criticality | annual value and clinical or operational criticality | Weights the decision | Verified records |   |   |   |
| Performance and dispute history | service-level misses and open disputes | Evidence for renegotiation | Earlier periods |   |   |   |
| Alternative availability | qualified alternative suppliers | Negotiation leverage | Qualification tables |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Deadline | Notice window computed by rule | Predicted deadline | The notice date is a fact in the contract |
| Priority | Value, risk and lead time combined | Renewal date only | A small contract with a short notice can be more urgent than a large one |
| Outcome | Renewed, renegotiated or exited with censoring | Binary renewal | Many contracts are still open |
| Evidence | Performance and dispute evidence shown | Score only | Owners need reasons |
| Timing | Recommended start date for review | Alert at the deadline | A late alert leaves no time to negotiate |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Contract title text | not risk |
| Account manager identity | not a driver |
| Signing date | explained by dates |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Days to notice deadline minus review lead time inputs | Procurement | Contract management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rule-computed. |
| Spend and criticality inputs | Contract management | Procurement and spend system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: verified records. |
| Performance and dispute history inputs | Legal | Supplier performance records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: earlier periods. |
| Alternative availability inputs | Finance | Obligation register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: qualification tables. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_contract_renewal_termination_inputs.v1
owner: procurement@example.com
system_of_record: Contract management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: days_to_notice_deadline_minus_review, type: double, nullable: false }
    - { name: spend_and_criticality, type: double, nullable: false }
    - { name: performance_and_dispute_history, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Days to notice deadline minus review lead time and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Spend and criticality against Contract management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Days to notice deadline minus review lead time, traces back to Contract management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE healthcare_contract_renewal_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE healthcare_contract_renewal_outputs (
  run_id TEXT NOT NULL REFERENCES healthcare_contract_renewal_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE healthcare_contract_renewal_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE healthcare_contract_renewal_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Contract Renewal & Termination Risk Prediction": Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Days to notice deadline minus review lead time | Remaining time before the latest action date less the usual review cycle. The urgency measure. | Leakage risk to design against: Rule-computed. |
| A signal-versus-noise trap in this use case: Deadline | The true signal is notice window computed by rule; the common noise is predicted deadline. | The notice date is a fact in the contract. |

**Ask the experts**

- [ ] What exactly does "Notice dates are deterministic and the model only prioritises review" mean in practice for healthcare contract renewal & termination risk prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Days to notice deadline minus review lead time" and "Spend and criticality", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Renewals reviewed before notice deadline" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: predicting dates that the contract states, and who can confirm the cut-off times and splits?
- [ ] How often does "Auto-renewal clause" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Censoring | Excluding or stopping observation of a patient after an event, here the hours at or after onset, so the model does not learn from treated patients. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| F1 score | The harmonic mean of precision and recall. |
