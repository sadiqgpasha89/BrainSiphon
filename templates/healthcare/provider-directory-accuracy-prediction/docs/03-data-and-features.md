# Provider Directory Accuracy Prediction: data and feature specification

> Generated from the blueprint `healthcare/provider-directory-accuracy-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Directory Accuracy Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Directory Accuracy Prediction": Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on records where change implies error.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Field age since verification | days since the field was last confirmed from a trusted source | Stale fields are more likely wrong | Use verification events |   |   |   |
| Cross-source disagreement | disagreement between directory, scheduling and credentialing for the field | Disagreement is a strong signal | Use the snapshot at scoring |   |   |   |
| Activity mismatch | absence of appointments or claims at a listed location | Suggests the location is inactive | Use a lagged window |   |   |   |
| Provider change propensity | historical rate of changes for similar practices | Some groups change often | Past data only |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Level | Field-level accuracy risk | Whole-record flag | A single wrong phone number differs from a closed practice |
| Evidence | Independent signals such as scheduling and attestation | One feed compared with itself | Duplicated sources agree on the same error |
| Freshness | Age of the last verified value per field | Record last-updated date | Updates to unrelated fields reset the date |
| Outreach | Highest-risk fields first within capacity | Sweep of every provider | Contact fatigue lowers response |
| Label | Verified correct or incorrect from outreach and calls | Whether a change was later made | Changes are not the only sign of error |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Provider popularity | does not relate to accuracy |
| Directory page traffic | reflects marketing |
| Provider age | protected and irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Field age since verification inputs | Provider data governance | Provider master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use verification events. |
| Cross-source disagreement inputs | Patient access | Provider directory and website feeds | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the snapshot at scoring. |
| Activity mismatch inputs | Marketing and digital | Scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use a lagged window. |
| Provider change propensity inputs | Provider data governance | Credentialing system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: past data only. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_directory_accuracy_prediction_inputs.v1
owner: provider-data-governance@example.com
system_of_record: Provider master data
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: field_age_since_verification, type: double, nullable: false }
    - { name: cross_source_disagreement, type: double, nullable: false }
    - { name: activity_mismatch, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Field age since verification and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Cross-source disagreement against Provider master data
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Field age since verification, traces back to Provider master data; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Jane Street Market Prediction | https://www.kaggle.com/c/jane-street-market-prediction | Competition rules; free Kaggle login | Anonymised market features with returns and a trade-or-not decision target | Anonymised and from one firm; check the data terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Diabetes 130-US Hospitals (UCI) | https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008 | CC BY 4.0 (see the UCI page) | 100K inpatient encounters with a 30-day readmission outcome | Old data and coarse features. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE provider_directory_accuracy_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE provider_directory_accuracy_outputs (
  run_id TEXT NOT NULL REFERENCES provider_directory_accuracy_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE provider_directory_accuracy_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE provider_directory_accuracy_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Directory Accuracy Prediction": Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Field age since verification | Days since the field was last confirmed from a trusted source. Stale fields are more likely wrong. | Leakage risk to design against: Use verification events. |
| A signal-versus-noise trap in this use case: Level | The true signal is field-level accuracy risk; the common noise is whole-record flag. | A single wrong phone number differs from a closed practice. |

**Ask the experts**

- [ ] What exactly does "Outputs are field-level accuracy risks and never replace attestation" mean in practice for provider directory accuracy prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Field age since verification" and "Cross-source disagreement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Directory error rate in secret-shopper audits" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on records where change implies error, and who can confirm the cut-off times and splits?
- [ ] How often does "Provider moves practice" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| OR block time | Reserved operating room time given to surgeons or services. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
