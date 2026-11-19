# Hospital Supply & Consumables Forecasting: data and feature specification

> Generated from the blueprint `healthcare/hospital-supply-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Hospital Supply & Consumables Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Hospital Supply & Consumables Forecasting": Forecast consumable demand per ward to prevent stock-outs of critical supplies and reduce expiry waste. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Censored demand during stock-outs.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Procedure schedule | upcoming surgeries by type | Known usage | Schedule as-of |   |   |   |
| Census and acuity | patient days by unit and acuity | Consumption | Forecast census |   |   |   |
| Lead-time variance | supplier delivery variance | Safety stock | Delivered dates |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Drivers | Link usage to census, procedures and case mix | Time-series only | Usage follows patient activity not calendar |
| Criticality | Service-level targets per item class | Uniform safety stock | Critical items need higher service |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Supplier invoice number | none |
| Ward name text | encoded by unit |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Procedure schedule inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: schedule as-of. |
| Census and acuity inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: forecast census. |
| Lead-time variance inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: delivered dates. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: hospital_supply_forecasting_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: procedure_schedule, type: double, nullable: false }
    - { name: census_and_acuity, type: double, nullable: false }
    - { name: lead_time_variance, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Procedure schedule and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Census and acuity against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Procedure schedule, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE hospital_supply_forecasting_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE hospital_supply_forecasting_outputs (
  run_id TEXT NOT NULL REFERENCES hospital_supply_forecasting_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE hospital_supply_forecasting_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE hospital_supply_forecasting_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Hospital Supply & Consumables Forecasting": Forecast consumable demand per ward to prevent stock-outs of critical supplies and reduce expiry waste. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Procedure schedule | Upcoming surgeries by type. Known usage. | Leakage risk to design against: Schedule as-of. |
| A signal-versus-noise trap in this use case: Drivers | The true signal is link usage to census, procedures and case mix; the common noise is time-series only. | Usage follows patient activity not calendar. |

**Ask the experts**

- [ ] What exactly does "Critical item service levels" mean in practice for hospital supply & consumables forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Procedure schedule" and "Census and acuity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Critical stock-outs" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: censored demand during stock-outs, and who can confirm the cut-off times and splits?
- [ ] How often does "Supplier recall" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Readmission | A return to hospital shortly after discharge, usually counted within 30 days and tied to quality penalties. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Wearable | A body-worn sensor, such as a watch, that records heart rate, movement or sleep. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
