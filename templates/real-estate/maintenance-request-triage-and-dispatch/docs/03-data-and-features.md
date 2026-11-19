# Maintenance Request Triage & Dispatch: data and feature specification

> Generated from the blueprint `real-estate/maintenance-request-triage-and-dispatch` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Maintenance Request Triage & Dispatch · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Maintenance Request Triage & Dispatch": Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels come from staff habits and may reflect past dispatch practice and not need.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Safety phrases | presence of terms such as gas smell, flooding, no heating or sparks in the text | Triggers urgent escalation | Terms vary by language and dialect, so test on local phrasing |   |   |   |
| Image classifier | probability that the photo shows a leak, mould, broken glass or electrical damage | Adds evidence the text omits | Photo quality varies, so require a confidence margin |   |   |   |
| Asset history | number and type of repairs on the unit and the equipment in the last 24 months | Repeated faults point to root causes | Records are incomplete for older buildings |   |   |   |
| Weather | temperature and rain forecast at the building on the day | Cold snaps and storms cause bursts of related requests | Forecasts are uncertain, so use it as context and not as a rule |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Urgency | Safety and habitability triggers such as gas, flooding and loss of heat | The tone of the message | Calm messages can describe a flood, and angry ones a dripping tap |
| Trade | The correct trade and the parts likely needed | A free-text category chosen by the tenant | A wrong trade wastes a visit, and a missing part wastes another |
| Photo | Images that clarify what is wrong and how bad it is | Text description alone | Photos often change both urgency and trade, such as a stain that is mould not damp |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Tenant name | Irrelevant to urgency or trade |
| Request length | A style that depends on the tenant and not on the severity |
| Time sent | Weakly related to urgency, and urgent problems occur at all hours |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Safety phrases inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: terms vary by language and dialect, so test on local phrasing. |
| Image classifier inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: photo quality varies, so require a confidence margin. |
| Asset history inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: records are incomplete for older buildings. |
| Weather inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: forecasts are uncertain, so use it as context and not as a rule. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: maintenance_request_triage_and_dispatch_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: safety_phrases, type: double, nullable: false }
    - { name: image_classifier, type: double, nullable: false }
    - { name: asset_history, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Safety phrases and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Image classifier against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Safety phrases, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Customer Support on Twitter | https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter | See the dataset page; free Kaggle login | About 3 million tweets and replies between customers and company support accounts | Public social posts; informal language. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE maintenance_request_triage_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE maintenance_request_triage_fields (
  document_id TEXT NOT NULL REFERENCES maintenance_request_triage_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE maintenance_request_triage_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Maintenance Request Triage & Dispatch": Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Safety phrases | Presence of terms such as gas smell, flooding, no heating or sparks in the text. Triggers urgent escalation. | Leakage risk to design against: Terms vary by language and dialect, so test on local phrasing. |
| A signal-versus-noise trap in this use case: Urgency | The true signal is safety and habitability triggers such as gas, flooding and loss of heat; the common noise is the tone of the message. | Calm messages can describe a flood, and angry ones a dripping tap. |

**Ask the experts**

- [ ] What exactly does "Emergencies receive a technician or a response within 1 hour" mean in practice for maintenance request triage & dispatch: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Safety phrases" and "Image classifier", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "First-visit fix rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels come from staff habits and may reflect past dispatch practice and not need, and who can confirm the cut-off times and splits?
- [ ] How often does "Emergency after hours" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| Fair housing | Laws prohibiting discrimination in selling, renting, advertising and financing housing. |
| RevPAR | Revenue per available room or unit: revenue divided by available room-nights. |
| Security deposit | Money held against damage or unpaid rent, returned after deductions at move-out. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Days on market | The number of days a listing takes to go under contract. |
| Steering | Guiding people toward or away from neighbourhoods based on protected characteristics. |
| Delinquency | A tenant being late on rent beyond the grace period. |
| BMS | Building management system: the control system that runs heating, cooling, lighting and sensors in a building. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
