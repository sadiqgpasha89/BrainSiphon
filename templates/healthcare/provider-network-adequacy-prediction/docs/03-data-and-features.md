# Provider Network Adequacy Prediction: data and feature specification

> Generated from the blueprint `healthcare/provider-network-adequacy-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Adequacy Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Network Adequacy Prediction": Evaluate whether a provider network can meet geographic, specialty, capacity and appointment-access requirements, separating a provider's presence in the directory from actual appointment capacity, and show underserved areas with uncertainty and an evidence trail. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting directory presence as capacity.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Travel time to the nearest qualified provider | drive or transit time from member areas | Core adequacy measure | Road network version |   |   |   |
| Accepting status and appointment capacity | observed slots and accepting flags | Real capacity | Data freshness shown |   |   |   |
| Provider-to-member ratio | qualified providers per member by area and specialty | Standard test | Member counts at the date |   |   |   |
| Directory freshness | age of the directory record | Confidence in presence | Source dates |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Standards | Versioned requirements by jurisdiction | Single national rule | Standards differ and change |
| Capacity | Appointment capacity separate from directory presence | Directory counts | A listed provider may not take new patients |
| Access | Travel time and distance on the road network | Straight-line distance | Real access depends on travel |
| Uncertainty | Ranges from stale or inferred data | Point estimate | Network decisions need confidence |
| Authority | Experts validate | Automatic compliance statement | Compliance determinations are human |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Provider marketing text | not capacity |
| Directory sort order | artefact |
| Practice name | label |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Travel time to the nearest qualified provider inputs | Network management | Provider directory and network management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: road network version. |
| Accepting status and appointment capacity inputs | Compliance | Appointment availability data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data freshness shown. |
| Provider-to-member ratio inputs | Provider relations | Member enrolment and geography | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: member counts at the date. |
| Directory freshness inputs | Regulatory affairs | Regulatory standards register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: source dates. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_network_adequacy_prediction_inputs.v1
owner: network-management@example.com
system_of_record: Provider directory and network management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: travel_time_to_the_nearest_qualified, type: double, nullable: false }
    - { name: accepting_status_and_appointment, type: double, nullable: false }
    - { name: provider_to_member_ratio, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Travel time to the nearest qualified provider and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Accepting status and appointment capacity against Provider directory and network management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Travel time to the nearest qualified provider, traces back to Provider directory and network management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE provider_network_adequacy_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE provider_network_adequacy_outputs (
  run_id TEXT NOT NULL REFERENCES provider_network_adequacy_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE provider_network_adequacy_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE provider_network_adequacy_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Network Adequacy Prediction": Evaluate whether a provider network can meet geographic, specialty, capacity and appointment-access requirements, separating a provider's presence in the directory from actual appointment capacity, and show underserved areas with uncertainty and an evidence trail. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Travel time to the nearest qualified provider | Drive or transit time from member areas. Core adequacy measure. | Leakage risk to design against: Road network version. |
| A signal-versus-noise trap in this use case: Standards | The true signal is versioned requirements by jurisdiction; the common noise is single national rule. | Standards differ and change. |

**Ask the experts**

- [ ] What exactly does "Network and compliance experts validate the standards and the results and the tool makes no filing" mean in practice for provider network adequacy prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Travel time to the nearest qualified provider" and "Accepting status and appointment capacity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Adequacy gaps found before filing" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: counting directory presence as capacity, and who can confirm the cut-off times and splits?
- [ ] How often does "Stale directory" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| p99 latency | The time within which 99% of requests complete. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
