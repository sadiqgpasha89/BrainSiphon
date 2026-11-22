# Staffing Coverage Gap Prediction: data and feature specification

> Generated from the blueprint `healthcare/staffing-coverage-gap-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Staffing Coverage Gap Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Staffing Coverage Gap Prediction": Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting filled shifts as false positives.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Open-shift age and fill hazard | hours since posting and historical fill rate for that role and shift type | Shifts that stay open past typical fill time rarely fill themselves | Use posting time and fill time as logged |   |   |   |
| Absence pressure | notified absences and aggregate sick-call rate for the unit-shift | Absences are the largest source of late gaps | Count only absences notified before scoring time |   |   |   |
| Eligible float depth | number of eligible float or cross-trained staff available for the shift | Gaps are survivable when eligible cover exists | Eligibility must come from verified credentials at that date |   |   |   |
| Demand-to-roster margin | forecast required hours minus rostered hours for the unit-shift | The direct measure of how thin a shift is | Use the roster and forecast snapshots from scoring time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Shift that actually fell below policy minimum at start time after all fills | Shift that was open at some earlier point | Most open shifts are filled and a model trained on them cries wolf |
| Rules | Deterministic coverage check against skill mix and credential validity | A learned score that decides whether coverage is met | A model cannot prove a safe ratio and must never override the rule |
| Timing | Lead time before shift start at which a gap is first predictable | Scoring only the final hours | A late alert leaves no time to find cover and inflates accuracy |
| Alert budget | Gap alerts per manager per week agreed with operations | Maximising recall with no budget | Managers mute a noisy list within weeks |
| Censoring | Shifts filled by the rules before start handled as time-to-event outcomes | Treating a successful intervention as a false positive | The model is penalised for the escalations it caused |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Individual employee reliability scores | punitive in effect and a privacy risk with little signal beyond aggregate absence |
| Manager identity | proxies for unit culture and is not a stable cause |
| Posting channel | reflects process not coverage risk |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Open-shift age and fill hazard inputs | Staffing office | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use posting time and fill time as logged. |
| Absence pressure inputs | Nursing operations | Credentialing and privileging system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: count only absences notified before scoring time. |
| Eligible float depth inputs | Credentialing office | Timekeeping system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: eligibility must come from verified credentials at that date. |
| Demand-to-roster margin inputs | Staffing office | Staffing threshold and escalation policy register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the roster and forecast snapshots from scoring time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: staffing_coverage_gap_prediction_inputs.v1
owner: staffing-office@example.com
system_of_record: Workforce management and scheduling system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: open_shift_age_and_fill_hazard, type: double, nullable: false }
    - { name: absence_pressure, type: double, nullable: false }
    - { name: eligible_float_depth, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Open-shift age and fill hazard and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Absence pressure against Workforce management and scheduling system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Open-shift age and fill hazard, traces back to Workforce management and scheduling system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE staffing_coverage_gap_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE staffing_coverage_gap_outputs (
  run_id TEXT NOT NULL REFERENCES staffing_coverage_gap_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE staffing_coverage_gap_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE staffing_coverage_gap_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Staffing Coverage Gap Prediction": Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Open-shift age and fill hazard | Hours since posting and historical fill rate for that role and shift type. Shifts that stay open past typical fill time rarely fill themselves. | Leakage risk to design against: Use posting time and fill time as logged. |
| A signal-versus-noise trap in this use case: Label | The true signal is shift that actually fell below policy minimum at start time after all fills; the common noise is shift that was open at some earlier point. | Most open shifts are filled and a model trained on them cries wolf. |

**Ask the experts**

- [ ] What exactly does "Scores every future shift in a 14-day window each night" mean in practice for staffing coverage gap prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Open-shift age and fill hazard" and "Absence pressure", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Gaps closed before shift start" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: counting filled shifts as false positives, and who can confirm the cut-off times and splits?
- [ ] How often does "Credential lapses between scoring and shift" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Blood culture | A lab test that grows bacteria from a blood sample; taken when infection is suspected and results take days. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Censoring | Excluding or stopping observation of a patient after an event, here the hours at or after onset, so the model does not learn from treated patients. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
