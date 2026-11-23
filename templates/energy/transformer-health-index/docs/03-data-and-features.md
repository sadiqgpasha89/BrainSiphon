# Transformer Health Index: data and feature specification

> Generated from the blueprint `energy/transformer-health-index` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Transformer Health Index · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Transformer Health Index": Combine age, loading, oil tests and maintenance history into an explainable health index per transformer so replacement and refurbishment are planned in the right order. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Age-only ranking.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Oil test results | dissolved gas and moisture values | Condition | From lab tests |   |   |   |
| Loading history | peak and average loading ratio | Thermal ageing | From SCADA |   |   |   |
| Age and manufacturer family | years in service and family | Prior | From the register |   |   |   |
| Maintenance and fault history | past repairs and through-faults | Stress | From work orders |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Failures and condition findings from teardown and repairs | Age alone | Age is a weak guide to condition |
| Output | A ranked list with reasons | A single score | Engineers need the reason to act |
| Risk | Failure probability times consequence | Probability alone | Consequence differs by location |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Asset tag | an identifier |
| Inspector name | irrelevant |
| Photo count | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Oil test results inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from lab tests. |
| Loading history inputs | Asset management | Meter data management and billing (CIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from SCADA. |
| Age and manufacturer family inputs | Retail and customer operations | Asset management and GIS | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the register. |
| Maintenance and fault history inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from work orders. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: transformer_health_index_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: oil_test_results, type: double, nullable: false }
    - { name: loading_history, type: double, nullable: false }
    - { name: age_and_manufacturer_family, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Oil test results and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Loading history against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Oil test results, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NASA Prognostics Data Repository (C-MAPSS and others) | https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/ | Public NASA data (see the page) | Run-to-failure sensor data for engines and other components | Simulated or lab data; real fleets are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE transformer_health_index_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE transformer_health_index_outputs (
  run_id TEXT NOT NULL REFERENCES transformer_health_index_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE transformer_health_index_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE transformer_health_index_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Transformer Health Index": Combine age, loading, oil tests and maintenance history into an explainable health index per transformer so replacement and refurbishment are planned in the right order. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Assets age and fail in the field | Transformers, cables, poles, pipes and pumps degrade with load, weather and time, and inspection data is sparse. Failures cause outages, safety incidents and environmental harm. | Asset health models must support the decision to inspect, repair or replace, within a safety-first culture. |
| Outage management is a fault location problem | When a fault trips protection, operators locate it from smart meter, SCADA and customer calls, then restore supply in stages. Faster location shortens outage minutes. | Customer minutes lost are the regulated measure, so restoration order matters as much as detection. |
| Field crews need practical work orders | Crew scheduling depends on location, skills, parts, access and permits. Plans that ignore these constraints fail on the day. | A model that ranks jobs without capacity and travel produces schedules nobody can run. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Oil test results | Dissolved gas and moisture values. Condition. | Leakage risk to design against: From lab tests. |
| A signal-versus-noise trap in this use case: Label | The true signal is failures and condition findings from teardown and repairs; the common noise is age alone. | Age is a weak guide to condition. |

**Ask the experts**

- [ ] What exactly does "Index with the top contributing factors" mean in practice for transformer health index: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Oil test results" and "Loading history", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "In-service failures" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: age-only ranking, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing oil tests" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Dissolved gas analysis | Testing gas in transformer oil to detect faults. |
| Condition-based maintenance | Maintaining assets when their condition requires it. |
| Transformer | Equipment that changes voltage levels. |
| Substation | A facility that transforms voltage and switches circuits. |
| Peak demand | The highest demand in a period. |
| Capacity factor | Actual output divided by maximum possible output. |
| Power factor | A measure of how effectively current is converted to useful power. |
| Pipe burst | A sudden failure of a water or gas pipe. |
| Meter data management | The system that stores and validates meter readings. |
| Work management | Systems for planning and tracking field jobs. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
