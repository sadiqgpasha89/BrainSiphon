# CMS Quality Program Penalty Forecasting: data and feature specification

> Generated from the blueprint `healthcare/cms-quality-program-penalty-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** CMS Quality Program Penalty Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "CMS Quality Program Penalty Forecasting": Estimate potential financial exposure under applicable quality-linked payment programs by combining current program rules with validated performance data, clearly labelled as scenario estimates and never as official determinations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Calling a statistical estimate the penalty.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Measure score gap to benchmark | distance from achievement and improvement thresholds | Drives the point scale | Benchmarks of the right year |   |   |   |
| Payment base | program payment base for the period | Scales exposure | Use the declared base |   |   |   |
| Sensitivity per measure | change in exposure per unit change in the measure | Prioritises work | Computed by the calculator |   |   |   |
| Pending data share | share of the period not yet reported | Sizes the uncertainty | As of the run |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Calculation | Rules as code from the published methodology | A statistical guess at the penalty | The payment adjustment is a calculation and not a prediction |
| Uncertainty | Distributions on pending performance inputs | A single exposure number | Leaders need the range and the swing measures |
| Versioning | Program-year parameter tables | Latest rules applied to old years | Backtests then misstate what happened |
| Labels | Estimate with stated gaps | Official-sounding figures | A wrong figure presented as official creates financial and reputational risk |
| Drivers | Measures ranked by marginal exposure | Overall score only | Improvement effort should go where dollars and patients are |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Prior year penalty amount | does not describe this year's rules |
| Peer penalties reported in the press | unverified |
| Executive expectation | not evidence |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Measure score gap to benchmark inputs | Quality and patient safety | Quality and performance reporting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: benchmarks of the right year. |
| Payment base inputs | Finance | Finance and revenue cycle system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the declared base. |
| Sensitivity per measure inputs | Compliance | Program rules library with year versions | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: computed by the calculator. |
| Pending data share inputs | Revenue cycle | Quality and performance reporting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: as of the run. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cms_quality_program_penalty_forecasting_inputs.v1
owner: quality-and-patient-safety@example.com
system_of_record: Quality and performance reporting system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: measure_score_gap_to_benchmark, type: double, nullable: false }
    - { name: payment_base, type: double, nullable: false }
    - { name: sensitivity_per_measure, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Measure score gap to benchmark and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Payment base against Quality and performance reporting system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Measure score gap to benchmark, traces back to Quality and performance reporting system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE cms_quality_program_penalty_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE cms_quality_program_penalty_outputs (
  run_id TEXT NOT NULL REFERENCES cms_quality_program_penalty_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE cms_quality_program_penalty_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE cms_quality_program_penalty_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "CMS Quality Program Penalty Forecasting": Estimate potential financial exposure under applicable quality-linked payment programs by combining current program rules with validated performance data, clearly labelled as scenario estimates and never as official determinations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Measure score gap to benchmark | Distance from achievement and improvement thresholds. Drives the point scale. | Leakage risk to design against: Benchmarks of the right year. |
| A signal-versus-noise trap in this use case: Calculation | The true signal is rules as code from the published methodology; the common noise is a statistical guess at the penalty. | The payment adjustment is a calculation and not a prediction. |

**Ask the experts**

- [ ] What exactly does "A transparent deterministic policy calculator is the base and predictive uncertainty sits on top of the inputs" mean in practice for cms quality program penalty forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Measure score gap to benchmark" and "Payment base", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Exposure estimate error at year end" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: calling a statistical estimate the penalty, and who can confirm the cut-off times and splits?
- [ ] How often does "Program rule change mid-year" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
