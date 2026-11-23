# Tax Return Error Detection: data and feature specification

> Generated from the blueprint `public-sector/tax-return-error-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tax Return Error Detection · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Tax Return Error Detection": Detect likely errors and omissions in returns before processing so taxpayers can correct them and audits focus on real risk. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past audit labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Third-party data mismatch | differences with employer and bank reports | Error | From information returns |   |   |   |
| Deduction pattern | claims relative to peers | Anomaly | From returns |   |   |   |
| Prior year change | change from last year | Plausibility | From history |   |   |   |
| Complexity indicators | forms and credits claimed | Risk | From returns |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Errors confirmed in random audits | Past audit selections | Past selections bias the model |
| Action | A correction prompt or review | An automatic assessment | Assessments need a person and appeal rights |
| Fairness | Equal error detection across income groups | Focus on low-income returns | Complex high-income returns hold more tax at risk |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Taxpayer name | irrelevant and private |
| Address | irrelevant and private |
| Preparer name | irrelevant for the model |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Third-party data mismatch inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from information returns. |
| Deduction pattern inputs | Programme and policy owners | Tax, benefits and licensing systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from returns. |
| Prior year change inputs | City operations | GIS and asset management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from history. |
| Complexity indicators inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from returns. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: tax_return_error_detection_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: third_party_data_mismatch, type: double, nullable: false }
    - { name: deduction_pattern, type: double, nullable: false }
    - { name: prior_year_change, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Third-party data mismatch and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Deduction pattern against Case management and CRM
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Third-party data mismatch, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE tax_return_error_detection_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE tax_return_error_detection_outputs (
  run_id TEXT NOT NULL REFERENCES tax_return_error_detection_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE tax_return_error_detection_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE tax_return_error_detection_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Tax Return Error Detection": Detect likely errors and omissions in returns before processing so taxpayers can correct them and audits focus on real risk. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Fraud and error are different problems | Improper payments arise from fraud, administrative error and misunderstanding. Treating all of them as fraud leads to harmful accusations and chases the wrong cause. | Cases flagged by a model should be reviewed by a person and handled proportionately. |
| Equity and fairness are measured across groups | Services affect different neighbourhoods, languages and groups differently, and historical data can embed past exclusion. Public bodies often have a legal equality duty. | Average accuracy hides differences, so outcomes should be checked across groups and areas. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Third-party data mismatch | Differences with employer and bank reports. Error. | Leakage risk to design against: From information returns. |
| A signal-versus-noise trap in this use case: Label | The true signal is errors confirmed in random audits; the common noise is past audit selections. | Past selections bias the model. |

**Ask the experts**

- [ ] What exactly does "Prompt to the taxpayer about a possible error rather than a penalty" mean in practice for tax return error detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Third-party data mismatch" and "Deduction pattern", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Tax corrected before refund" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: past audit labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Law change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Tax compliance | Whether taxpayers file and pay correctly. |
| Appeal | A formal challenge to a decision. |
| Overpayment | Money paid to someone beyond their entitlement. |
| Caseworker | An official who assesses and manages cases for individuals. |
| Entitlement | A benefit or service a person has a right to. |
| Administrative law | Law that governs how public bodies make decisions. |
| Case management | Systems for tracking cases through a process. |
| Improper payment | A payment made in error, whether from fraud or mistake. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
