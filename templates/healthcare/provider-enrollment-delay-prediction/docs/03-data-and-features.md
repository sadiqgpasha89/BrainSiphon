# Provider Enrollment Delay Prediction: data and feature specification

> Generated from the blueprint `healthcare/provider-enrollment-delay-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Enrollment Delay Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Enrollment Delay Prediction": Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Starting the clock before the file is complete.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Completeness at submission | share of required items present on submission | Incomplete submissions are the leading cause of delay | As of the submission event |   |   |   |
| Payer SLA position | days elapsed against the payer's stated turnaround | Shows whether the payer is late | Use payer SLA table versions |   |   |   |
| Stage dwell time | time spent in the current stage relative to the payer median | Stalls are predictive | Computed from event time |   |   |   |
| Follow-up count | number of status follow-ups made so far | A proxy for payer friction | Count only prior follow-ups |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Target | Calendar days from complete submission to payer effective date with censoring | Days from the first draft | The clock starts at completeness not at the first form |
| Segmentation | Models or features per payer and process | One pooled average | Payers differ by an order of magnitude in turnaround |
| Bottleneck | Likely stage such as missing attestation or payer backlog | Generic delay probability | A specialist needs the next action not a score |
| Claims | Expected date range with uncertainty | Guarantee of start date | Reimbursement depends on payer decisions the model cannot see |
| Leakage | Features known at submission and at each status event | Final status fields | Final status contains the outcome |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Provider reputation | irrelevant to administrative processing |
| Payer contact name | personal and unstable |
| Final status code | contains the outcome |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Completeness at submission inputs | Provider enrollment | Provider enrollment system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: as of the submission event. |
| Payer SLA position inputs | Revenue cycle | Credentialing system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use payer SLA table versions. |
| Stage dwell time inputs | Managed-care contracting | Payer portals and roster files | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: computed from event time. |
| Follow-up count inputs | Provider enrollment | Revenue cycle system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: count only prior follow-ups. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_enrollment_delay_prediction_inputs.v1
owner: provider-enrollment@example.com
system_of_record: Provider enrollment system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: completeness_at_submission, type: double, nullable: false }
    - { name: payer_sla_position, type: double, nullable: false }
    - { name: stage_dwell_time, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Completeness at submission and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Payer SLA position against Provider enrollment system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Completeness at submission, traces back to Provider enrollment system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE provider_enrollment_delay_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE provider_enrollment_delay_outputs (
  run_id TEXT NOT NULL REFERENCES provider_enrollment_delay_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE provider_enrollment_delay_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE provider_enrollment_delay_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Enrollment Delay Prediction": Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Completeness at submission | Share of required items present on submission. Incomplete submissions are the leading cause of delay. | Leakage risk to design against: As of the submission event. |
| A signal-versus-noise trap in this use case: Target | The true signal is calendar days from complete submission to payer effective date with censoring; the common noise is days from the first draft. | The clock starts at completeness not at the first form. |

**Ask the experts**

- [ ] What exactly does "Predictions are segmented by payer and process type" mean in practice for provider enrollment delay prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Completeness at submission" and "Payer SLA position", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Days from submission to effective date" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: starting the clock before the file is complete, and who can confirm the cut-off times and splits?
- [ ] How often does "Payer changes process" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Censoring | Excluding or stopping observation of a patient after an event, here the hours at or after onset, so the model does not learn from treated patients. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Segmentation | Outlining the exact pixels of an organ, tumour or structure in an image. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
