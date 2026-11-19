# Patient Digital Twin for Treatment Response: data and feature specification

> Generated from the blueprint `healthcare/patient-digital-twin-treatment-response` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Digital Twin for Treatment Response · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Patient Digital Twin for Treatment Response": Simulate individual patient trajectories under alternative treatments using causal models to support shared decision making. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on treated patients only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pre-treatment covariate balance | propensity overlap diagnostics | Identifiability | Overlap assumption |   |   |   |
| Biomarker trajectory pre-treatment | longitudinal lab trends | Heterogeneity | Index date |   |   |   |
| Treatment history sequence | prior therapies | Response context | Order |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Causality | Counterfactual estimation with adjustment for confounding | Predicting outcomes under observed treatment | Treatment assignment is confounded by indication |
| Validation | Compare with randomised trial effect estimates | Fit on retrospective data only | Retrospective fit can be systematically biased |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Post-treatment events | mediators and colliders |
| Hospital branding | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pre-treatment covariate balance inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: overlap assumption. |
| Biomarker trajectory pre-treatment inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: index date. |
| Treatment history sequence inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: order. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: patient_digital_twin_treatment_response_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pre_treatment_covariate_balance, type: double, nullable: false }
    - { name: biomarker_trajectory_pre_treatment, type: double, nullable: false }
    - { name: treatment_history_sequence, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Pre-treatment covariate balance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Biomarker trajectory pre-treatment against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pre-treatment covariate balance, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE patient_digital_twin_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE patient_digital_twin_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES patient_digital_twin_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE patient_digital_twin_assignments (
  plan_id TEXT NOT NULL REFERENCES patient_digital_twin_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE patient_digital_twin_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Patient Digital Twin for Treatment Response": Simulate individual patient trajectories under alternative treatments using causal models to support shared decision making. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Learning from logs: off-policy evaluation | Most business data were generated by an earlier policy. To judge a new policy offline you need the probability with which each logged action was chosen; estimators such as inverse propensity weighting, self-normalised weighting and doubly robust methods correct for the difference, with a bias-variance trade-off. | Never evaluate a new policy only on the rows where it agrees with the old one; log propensities from day one. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Pre-treatment covariate balance | Propensity overlap diagnostics. Identifiability. | Leakage risk to design against: Overlap assumption. |
| A signal-versus-noise trap in this use case: Causality | The true signal is counterfactual estimation with adjustment for confounding; the common noise is predicting outcomes under observed treatment. | Treatment assignment is confounded by indication. |

**Ask the experts**

- [ ] What exactly does "Causal validity" mean in practice for patient digital twin for treatment response: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pre-treatment covariate balance" and "Biomarker trajectory pre-treatment", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Clinician use and agreement" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on treated patients only, and who can confirm the cut-off times and splits?
- [ ] How often does "Hidden confounders" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Policy | The rule that maps a situation to an action. |
| Doubly robust estimator | An off-policy estimator that combines a reward model with propensity weighting. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Stationarity | A series whose statistical properties do not change over time. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| Lag feature | A past value of the series used as a predictor. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
