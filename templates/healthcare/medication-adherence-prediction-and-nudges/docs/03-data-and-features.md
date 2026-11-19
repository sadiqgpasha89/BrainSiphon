# Medication Adherence Prediction & Nudges: data and feature specification

> Generated from the blueprint `healthcare/medication-adherence-prediction-and-nudges` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Medication Adherence Prediction & Nudges · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Medication Adherence Prediction & Nudges": Identify patients likely to stop therapy and choose the supportive nudge that most improves adherence within a contact budget. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Missing fills at other pharmacies counted as non-adherence.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Refill gap pattern | days late on past refills | Early disengagement | Matured fills only |   |   |   |
| Cost-sharing change | copay change at fill | Financial barrier | Plan year |   |   |   |
| Side-effect reports | patient-reported or call-centre notes | Reason to stop | Consent |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Uplift | Which nudge raises adherence for whom | Predicting non-adherence only | Prediction without action design wastes budget |
| Measure | Proportion of days covered with refill gaps | Single refill event | One late refill is not abandonment |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Pharmacy ID | channel |
| Message send time | confounded |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Refill gap pattern inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: matured fills only. |
| Cost-sharing change inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: plan year. |
| Side-effect reports inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: consent. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: medication_adherence_prediction_and_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: refill_gap_pattern, type: double, nullable: false }
    - { name: cost_sharing_change, type: double, nullable: false }
    - { name: side_effect_reports, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Refill gap pattern and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Cost-sharing change against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Refill gap pattern, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| eICU Collaborative Research Database | https://physionet.org/content/eicu-crd/2.0/ | PhysioNet Credentialed Health Data License; credentialing required | ICU stays from many US hospitals, for cross-site testing | Credentialed access; coding differs by hospital. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE medication_adherence_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE medication_adherence_outputs (
  run_id TEXT NOT NULL REFERENCES medication_adherence_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE medication_adherence_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE medication_adherence_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Medication Adherence Prediction & Nudges": Identify patients likely to stop therapy and choose the supportive nudge that most improves adherence within a contact budget. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Refill gap pattern | Days late on past refills. Early disengagement. | Leakage risk to design against: Matured fills only. |
| A signal-versus-noise trap in this use case: Uplift | The true signal is which nudge raises adherence for whom; the common noise is predicting non-adherence only. | Prediction without action design wastes budget. |

**Ask the experts**

- [ ] What exactly does "Consent for outreach" mean in practice for medication adherence prediction & nudges: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Refill gap pattern" and "Cost-sharing change", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Proportion of days covered" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: missing fills at other pharmacies counted as non-adherence, and who can confirm the cut-off times and splits?
- [ ] How often does "Patient switches pharmacies" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Medication adherence | Whether patients take medicines as prescribed. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Policy | The rule that maps a situation to an action. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
