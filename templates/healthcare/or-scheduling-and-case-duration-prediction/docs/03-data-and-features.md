# OR Scheduling & Surgical Case Duration Prediction: data and feature specification

> Generated from the blueprint `healthcare/or-scheduling-and-case-duration-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** OR Scheduling & Surgical Case Duration Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "OR Scheduling & Surgical Case Duration Prediction": Predict surgical case durations and sequence operating-room blocks to cut overtime and idle time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using actual durations booked after the fact.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Surgeon-procedure history | surgeon's median duration for procedure | Largest driver | Window before case date |   |   |   |
| Patient complexity indicators | BMI, ASA class, comorbidity count | Duration modifiers | Pre-op data |   |   |   |
| Team and room factors | resident presence, room type | Efficiency | Rosters as-of |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Distribution | Quantile predictions of duration with surgeon effects | Mean duration | Mean-based schedules overrun half the time |
| Scheduling | Stochastic optimisation using duration uncertainty | Deterministic slotting | Variance drives overtime |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Case booking time of day | none |
| Surgeon seniority number | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Surgeon-procedure history inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window before case date. |
| Patient complexity indicators inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: pre-op data. |
| Team and room factors inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rosters as-of. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: or_scheduling_and_case_duration_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: surgeon_procedure_history, type: double, nullable: false }
    - { name: patient_complexity_indicators, type: double, nullable: false }
    - { name: team_and_room_factors, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Surgeon-procedure history and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Patient complexity indicators against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Surgeon-procedure history, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE or_scheduling_and_case_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE or_scheduling_and_case_outputs (
  run_id TEXT NOT NULL REFERENCES or_scheduling_and_case_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE or_scheduling_and_case_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE or_scheduling_and_case_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "OR Scheduling & Surgical Case Duration Prediction": Predict surgical case durations and sequence operating-room blocks to cut overtime and idle time. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Surgeon-procedure history | Surgeon's median duration for procedure. Largest driver. | Leakage risk to design against: Window before case date. |
| A signal-versus-noise trap in this use case: Distribution | The true signal is quantile predictions of duration with surgeon effects; the common noise is mean duration. | Mean-based schedules overrun half the time. |

**Ask the experts**

- [ ] What exactly does "Surgeon preferences" mean in practice for or scheduling & surgical case duration prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Surgeon-procedure history" and "Patient complexity indicators", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Overtime hours" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using actual durations booked after the fact, and who can confirm the cut-off times and splits?
- [ ] How often does "New surgical technique" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| OR block time | Reserved operating room time given to surgeons or services. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Lag feature | A past value of the series used as a predictor. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
