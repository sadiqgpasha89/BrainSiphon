# Provider Credential Expiration & Renewal Prediction: data and feature specification

> Generated from the blueprint `healthcare/provider-credential-expiration-renewal-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Credential Expiration & Renewal Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Credential Expiration & Renewal Prediction": Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating open renewals as failures.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Days to expiry minus expected completion time | remaining time minus the typical verification turnaround | Directly expresses the buffer | Use the verification turnaround known at scoring time |   |   |   |
| Missing evidence count | required documents not yet received | The usual blocker | Snapshot as of scoring |   |   |   |
| Prior reminder response | days from reminder to submission in past cycles | Past responsiveness predicts friction | Strictly earlier cycles |   |   |   |
| Verification source latency | median turnaround of the source for the credential type | Slow sources create risk | Trailing window |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Deadline | Rule-based expiry calendar with lead times | Model estimate of the expiry date | Expiry is a fact in the record not a prediction |
| Risk | Probability the renewal will not complete before expiry | Probability the provider is careless | Operational friction not character drives lateness |
| Outcome | Time to completion with censoring for open renewals | Binary renewed or not | Open cases are not failures yet |
| Outreach | Ranked work queue with the blocking evidence | Mass reminders | Generic reminders are ignored |
| Policy | Lapse handling follows policy and committee | Automatic scheduling holds | A hold is an employment action needing human approval |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Provider specialty prestige | not a driver of lateness |
| Provider age | protected and irrelevant |
| Employment status alone | confounds process with outcome |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Days to expiry minus expected completion time inputs | Medical staff office | Credentialing and privileging system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the verification turnaround known at scoring time. |
| Missing evidence count inputs | Credentialing operations | Provider master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: snapshot as of scoring. |
| Prior reminder response inputs | Provider data governance | Primary-source verification services | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: strictly earlier cycles. |
| Verification source latency inputs | Medical staff office | Credentialing and privileging system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: trailing window. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_credential_expiration_renewal_inputs.v1
owner: medical-staff-office@example.com
system_of_record: Credentialing and privileging system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: days_to_expiry_minus_expected, type: double, nullable: false }
    - { name: missing_evidence_count, type: double, nullable: false }
    - { name: prior_reminder_response, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Days to expiry minus expected completion time and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Missing evidence count against Credentialing and privileging system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Days to expiry minus expected completion time, traces back to Credentialing and privileging system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE provider_credential_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE provider_credential_outputs (
  run_id TEXT NOT NULL REFERENCES provider_credential_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE provider_credential_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE provider_credential_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Credential Expiration & Renewal Prediction": Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Days to expiry minus expected completion time | Remaining time minus the typical verification turnaround. Directly expresses the buffer. | Leakage risk to design against: Use the verification turnaround known at scoring time. |
| A signal-versus-noise trap in this use case: Deadline | The true signal is rule-based expiry calendar with lead times; the common noise is model estimate of the expiry date. | Expiry is a fact in the record not a prediction. |

**Ask the experts**

- [ ] What exactly does "Deadline rules are deterministic and the model only prioritises outreach" mean in practice for provider credential expiration & renewal prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Days to expiry minus expected completion time" and "Missing evidence count", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Credentials lapsed per month" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating open renewals as failures, and who can confirm the cut-off times and splits?
- [ ] How often does "Verification source outage" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Censoring | Excluding or stopping observation of a patient after an event, here the hours at or after onset, so the model does not learn from treated patients. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| F1 score | The harmonic mean of precision and recall. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Lag feature | A past value of the series used as a predictor. |
| p99 latency | The time within which 99% of requests complete. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
