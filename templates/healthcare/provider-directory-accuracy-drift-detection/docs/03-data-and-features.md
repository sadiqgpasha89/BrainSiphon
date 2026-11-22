# Provider Directory Accuracy & Drift Detection: data and feature specification

> Generated from the blueprint `healthcare/provider-directory-accuracy-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Directory Accuracy & Drift Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Directory Accuracy & Drift Detection": Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting inferred signals override authoritative sources.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Source disagreement | difference between the directory value and an authoritative or attested value | Direct drift signal | Source snapshots |   |   |   |
| Record age since last verification | days since the field was confirmed | Staleness risk | Verification log |   |   |   |
| Change-event volume | updates in related systems for the same provider | Hints at change | Event feeds |   |   |   |
| Source reliability tier | authority class of each source | Weights the evidence | Source register |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Fields | Field-level drift for address, phone, specialty, status and panel | Record-level score | Different fields change at different rates |
| Sources | Authoritative and inferred sources ranked | All sources equal | A regulator file outranks a claims inference |
| Freshness | Age of each source shown | Latest value wins | A newer value from a weak source can be wrong |
| Authority | Steward or provider confirms | Auto-publish | Directory errors harm members |
| Use | Data quality only | Provider scoring | A drift flag is not a judgment of the provider |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Directory sort order | artefact |
| Practice marketing text | not data |
| Record creation date alone | not drift |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Source disagreement inputs | Provider data management | Provider directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: source snapshots. |
| Record age since last verification inputs | Network management | Provider attestation system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: verification log. |
| Change-event volume inputs | Compliance | Credentialing system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event feeds. |
| Source reliability tier inputs | Provider relations | Authoritative source feeds | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: source register. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_directory_accuracy_drift_inputs.v1
owner: provider-data-management@example.com
system_of_record: Provider directory
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: source_disagreement, type: double, nullable: false }
    - { name: record_age_since_last_verification, type: double, nullable: false }
    - { name: change_event_volume, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Source disagreement and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Record age since last verification against Provider directory
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Source disagreement, traces back to Provider directory; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Diabetes 130-US Hospitals (UCI) | https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008 | CC BY 4.0 (see the UCI page) | 100K inpatient encounters with a 30-day readmission outcome | Old data and coarse features. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Jane Street Market Prediction | https://www.kaggle.com/c/jane-street-market-prediction | Competition rules; free Kaggle login | Anonymised market features with returns and a trade-or-not decision target | Anonymised and from one firm; check the data terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

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

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Directory Accuracy & Drift Detection": Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Source disagreement | Difference between the directory value and an authoritative or attested value. Direct drift signal. | Leakage risk to design against: Source snapshots. |
| A signal-versus-noise trap in this use case: Fields | The true signal is field-level drift for address, phone, specialty, status and panel; the common noise is record-level score. | Different fields change at different rates. |

**Ask the experts**

- [ ] What exactly does "A data steward or the provider confirms a correction before publication and the tool never edits the live directory" mean in practice for provider directory accuracy & drift detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Source disagreement" and "Record age since last verification", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Directory accuracy on audited samples" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting inferred signals override authoritative sources, and who can confirm the cut-off times and splits?
- [ ] How often does "Provider with several locations" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
