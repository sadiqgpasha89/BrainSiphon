# Public Service Appointment No-Show Prediction: data and feature specification

> Generated from the blueprint `public-sector/public-appointment-no-show-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Service Appointment No-Show Prediction · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Public Service Appointment No-Show Prediction": Predict missed appointments at licensing, registry and advice offices so reminders and slots are managed, and never to deny or penalise anyone. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Penalising predicted no-shows.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lead time | days between booking and the appointment | Risk | From booking |   |   |   |
| Reminder response | confirmation of reminders | Intent | From messaging |   |   |   |
| Appointment type | service and slot type | Base rate | From booking |   |   |   |
| Day and time | weekday and time of day | Access | From booking |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Purpose | Better slot use and helpful reminders | Penalising likely no-shows | People miss appointments for reasons such as work or transport |
| Label | Appointments missed without rebooking | Cancellations | Cancellations free the slot |
| Fairness | Reminder quality across groups | Targeting by neighbourhood | Targeting can reinforce unequal service |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Person name | irrelevant and private |
| Address | irrelevant and private |
| Device type | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lead time inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from booking. |
| Reminder response inputs | Programme and policy owners | Tax, benefits and licensing systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from messaging. |
| Appointment type inputs | City operations | GIS and asset management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from booking. |
| Day and time inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from booking. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: public_appointment_no_show_prediction_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lead_time, type: double, nullable: false }
    - { name: reminder_response, type: double, nullable: false }
    - { name: appointment_type, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Lead time and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Reminder response against Case management and CRM
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lead time, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Diabetes 130-US Hospitals (UCI) | https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008 | CC BY 4.0 (see the UCI page) | 100K inpatient encounters with a 30-day readmission outcome | Old data and coarse features. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE public_appointment_no_show_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE public_appointment_no_show_outputs (
  run_id TEXT NOT NULL REFERENCES public_appointment_no_show_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE public_appointment_no_show_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE public_appointment_no_show_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Public Service Appointment No-Show Prediction": Predict missed appointments at licensing, registry and advice offices so reminders and slots are managed, and never to deny or penalise anyone. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Equity and fairness are measured across groups | Services affect different neighbourhoods, languages and groups differently, and historical data can embed past exclusion. Public bodies often have a legal equality duty. | Average accuracy hides differences, so outcomes should be checked across groups and areas. |
| Citizen service is multi-channel and multilingual | People contact government by phone, web, counter and post, in many languages, often at stressful moments. Good service gives consistent answers and a path to a human. | An assistant that gives wrong guidance on entitlements can cost someone their benefit. |
| Planning relies on forecasts with uncertainty | Housing, schools, transport and services are planned from population, demand and land-use forecasts that carry wide uncertainty, so scenarios matter more than single numbers. | A single forecast presented as certain can lock in the wrong capacity. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Lead time | Days between booking and the appointment. Risk. | Leakage risk to design against: From booking. |
| A signal-versus-noise trap in this use case: Purpose | The true signal is better slot use and helpful reminders; the common noise is penalising likely no-shows. | People miss appointments for reasons such as work or transport. |

**Ask the experts**

- [ ] What exactly does "Used for reminders and overbooking limits only" mean in practice for public service appointment no-show prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Lead time" and "Reminder response", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "No-show rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: penalising predicted no-shows, and who can confirm the cut-off times and splits?
- [ ] How often does "Public transport strike" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Service level | A target for response or resolution time. |
| Citizen portal | A website where residents access government services. |
| Smart city | A city that uses connected sensors and data to run services. |
| Vulnerable person | Someone who needs extra support to use services safely. |
| Administrative law | Law that governs how public bodies make decisions. |
| 311 service | A non-emergency service line for city issues. |
| Purpose limitation | The rule that data may only be used for the purpose it was collected for. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
