# Healthcare Workforce Burnout & Attrition Early Warning: data and feature specification

> Generated from the blueprint `healthcare/healthcare-workforce-burnout-attrition-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Burnout & Attrition Early Warning · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Workforce Burnout & Attrition Early Warning": Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on a random split of employees rather than by period.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Schedule churn | share of shifts changed within 72 hours at unit level | Unpredictable schedules are strongly associated with turnover | Use schedule snapshots prior to the outcome window |   |   |   |
| Overtime load | unit mean and tail of overtime hours per head | Sustained overtime tracks with fatigue and exits | Aggregate and lag it |   |   |   |
| Vacancy burden | open positions relative to budgeted FTE | The remaining team absorbs the gap | Use the vacancy snapshot |   |   |   |
| Consecutive-shift pressure | share of staff on long runs of consecutive shifts in the unit | Rest is a recognised protective factor | Aggregate only |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Unit of analysis | Team and unit aggregates above a minimum size | Individual-level risk scores | Individual scoring becomes a punitive tool and breaches trust |
| Signal | Operational conditions such as overtime, schedule churn and vacancy load | Inferred emotional or health state | Health inference is invasive and outside lawful basis |
| Outcome | Voluntary attrition and aggregate absence as events with censoring | Anyone who left | Retirements and involuntary exits are different events |
| Action | Supportive interventions such as workload relief | Targeting named people | Targeting causes the harm the model claims to prevent |
| Causality | Associations flagged as hypotheses for leaders to test | Claiming conditions cause departures | A correlation presented as a cause leads to wrong investment |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Age, gender and ethnicity | protected traits with no place in the model |
| Individual sentiment from messages | surveillance and a consent problem |
| Health or leave reasons | sensitive data outside scope |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Schedule churn inputs | HR analytics | HR information system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use schedule snapshots prior to the outcome window. |
| Overtime load inputs | Employee wellbeing | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: aggregate and lag it. |
| Vacancy burden inputs | Privacy office | Employee survey platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the vacancy snapshot. |
| Consecutive-shift pressure inputs | Nursing operations | Timekeeping system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: aggregate only. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_workforce_burnout_attrition_inputs.v1
owner: hr-analytics@example.com
system_of_record: HR information system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: schedule_churn, type: double, nullable: false }
    - { name: overtime_load, type: double, nullable: false }
    - { name: vacancy_burden, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Schedule churn and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Overtime load against HR information system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Schedule churn, traces back to HR information system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Predict Students' Dropout and Academic Success | https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success | CC BY 4.0 (see the UCI page) | 4,400 students with enrolment and early-performance features and a dropout label | One institution; small. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open University Learning Analytics Dataset (OULAD) | https://analyse.kmi.open.ac.uk/open_dataset | CC BY 4.0 (see the page) | Student demographics, VLE click streams and outcomes for 32,000 students | UK distance learning; coarse click aggregation. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE healthcare_workforce_burnout_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE healthcare_workforce_burnout_outputs (
  run_id TEXT NOT NULL REFERENCES healthcare_workforce_burnout_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE healthcare_workforce_burnout_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE healthcare_workforce_burnout_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Workforce Burnout & Attrition Early Warning": Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Definitions: Sepsis-3, SIRS and qSOFA | Sepsis-3 defines sepsis as suspected infection plus an acute rise of 2 or more points in the SOFA organ-failure score, and septic shock as sepsis that needs vasopressors to keep blood pressure up and has lactate above 2 mmol/L despite fluids. Older screening tools are still used: SIRS (two of abnormal temperature, heart rate, breathing rate or white cell count) and qSOFA (fast breathing, low systolic pressure, altered mentation). | Which definition you label with changes prevalence, onset time and what the model learns, so pick it with clinicians and write it down. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Schedule churn | Share of shifts changed within 72 hours at unit level. Unpredictable schedules are strongly associated with turnover. | Leakage risk to design against: Use schedule snapshots prior to the outcome window. |
| A signal-versus-noise trap in this use case: Unit of analysis | The true signal is team and unit aggregates above a minimum size; the common noise is individual-level risk scores. | Individual scoring becomes a punitive tool and breaches trust. |

**Ask the experts**

- [ ] What exactly does "Analysis is at team or unit level with a minimum group size and small-cell suppression" mean in practice for healthcare workforce burnout & attrition early warning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Schedule churn" and "Overtime load", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Voluntary attrition rate in supported units" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on a random split of employees rather than by period, and who can confirm the cut-off times and splits?
- [ ] How often does "A team shrinks below the minimum size" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Censoring | Excluding or stopping observation of a patient after an event, here the hours at or after onset, so the model does not learn from treated patients. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Sepsis | Life-threatening organ dysfunction caused by a dysregulated response to infection. |
| SOFA | Sequential Organ Failure Assessment, a score from 0 to 24 summarising the function of six organ systems; a rise of 2 or more signals sepsis. |
| qSOFA | A bedside screen scoring breathing rate of 22 or more, systolic pressure of 100 or less and altered mentation. |
| SIRS | Systemic inflammatory response syndrome: two or more of abnormal temperature, heart rate above 90, breathing rate above 20 or abnormal white cell count. |
| MAP | Mean arterial pressure, the average blood pressure during a heartbeat cycle; below 65 mmHg suggests poor organ perfusion. |
| Lactate | A blood marker of tissue oxygen shortage; above 2 mmol/L is abnormal and above 4 mmol/L is serious. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
