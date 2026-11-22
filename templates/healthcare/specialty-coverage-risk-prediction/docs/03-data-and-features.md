# Specialty Coverage Risk Prediction: data and feature specification

> Generated from the blueprint `healthcare/specialty-coverage-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Specialty Coverage Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Specialty Coverage Risk Prediction": Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting shortfalls that rules show.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Coverage depth | qualified physicians available per slot beyond the minimum | Fragility measure | Roster snapshot |   |   |   |
| Demand-to-capacity ratio | forecast demand against available capacity | Spike risk | Forecast snapshot |   |   |   |
| Credential and privilege expiry | upcoming expirations of those who cover | Hidden supply loss | Credential records |   |   |   |
| Historical gap frequency | past gaps for the specialty and site | Base rate | Earlier periods |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Rules | Minimum coverage as a deterministic check | Model-only risk | A known shortfall needs no prediction |
| Cause | Demand, leave, vacancy, credential or fragility cause shown | Single risk score | Different causes need different contingencies |
| Fragility | Coverage depth and single points of failure | Roster count | One absence can break a thin roster |
| Horizon | Risk by future week | Today's status only | Contingency needs lead time |
| Action | Options listed for validation | Automatic call-in | Contacting physicians has costs and rules |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Specialty name | label |
| Roster file format | artefact |
| Physician seniority | not a driver |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Coverage depth inputs | Clinical operations | Coverage roster and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: roster snapshot. |
| Demand-to-capacity ratio inputs | Medical group leadership | Leave and vacancy records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: forecast snapshot. |
| Credential and privilege expiry inputs | Physician scheduling office | Privilege and credential records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: credential records. |
| Historical gap frequency inputs | Medical staff office | Demand and census feeds | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: earlier periods. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: specialty_coverage_risk_prediction_inputs.v1
owner: clinical-operations@example.com
system_of_record: Coverage roster and scheduling system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: coverage_depth, type: double, nullable: false }
    - { name: demand_to_capacity_ratio, type: double, nullable: false }
    - { name: credential_and_privilege_expiry, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Coverage depth and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Demand-to-capacity ratio against Coverage roster and scheduling system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Coverage depth, traces back to Coverage roster and scheduling system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Heart Disease | https://archive.ics.uci.edu/dataset/45/heart+disease | CC BY 4.0 (see the UCI page) | Small clinical dataset with a heart-disease label | Tiny; use only to test pipeline and calibration code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE specialty_coverage_risk_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE specialty_coverage_risk_outputs (
  run_id TEXT NOT NULL REFERENCES specialty_coverage_risk_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE specialty_coverage_risk_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE specialty_coverage_risk_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Specialty Coverage Risk Prediction": Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Coverage depth | Qualified physicians available per slot beyond the minimum. Fragility measure. | Leakage risk to design against: Roster snapshot. |
| A signal-versus-noise trap in this use case: Rules | The true signal is minimum coverage as a deterministic check; the common noise is model-only risk. | A known shortfall needs no prediction. |

**Ask the experts**

- [ ] What exactly does "Clinical operations validates contingency actions and the model never changes a schedule or contacts a physician" mean in practice for specialty coverage risk prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Coverage depth" and "Demand-to-capacity ratio", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Gaps avoided or mitigated" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: predicting shortfalls that rules show, and who can confirm the cut-off times and splits?
- [ ] How often does "Rare specialty with few gaps" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Sepsis | Life-threatening organ dysfunction caused by a dysregulated response to infection. |
| SOFA | Sequential Organ Failure Assessment, a score from 0 to 24 summarising the function of six organ systems; a rise of 2 or more signals sepsis. |
| qSOFA | A bedside screen scoring breathing rate of 22 or more, systolic pressure of 100 or less and altered mentation. |
| SIRS | Systemic inflammatory response syndrome: two or more of abnormal temperature, heart rate above 90, breathing rate above 20 or abnormal white cell count. |
| MAP | Mean arterial pressure, the average blood pressure during a heartbeat cycle; below 65 mmHg suggests poor organ perfusion. |
| Lactate | A blood marker of tissue oxygen shortage; above 2 mmol/L is abnormal and above 4 mmol/L is serious. |
| Vasopressor | A drug such as norepinephrine that raises blood pressure, used in septic shock. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
