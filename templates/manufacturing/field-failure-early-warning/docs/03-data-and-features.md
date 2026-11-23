# Field Failure Early Warning: data and feature specification

> Generated from the blueprint `manufacturing/field-failure-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Field Failure Early Warning · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Field Failure Early Warning": Detect emerging field failure patterns for a product from service, telemetry and return data weeks before warranty claims show them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Raw counts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Failure rate versus expected | observed to expected ratio by variant and age | Primary signal | Exposure adjusted |   |   |   |
| Telemetry fault codes | fault code rates in the field | Early signal | Per firmware |   |   |   |
| Return reason mix | returns by reason code | Confirms the mode | Coded reasons |   |   |   |
| Build attributes | plant, line and component lot | Cause | From genealogy |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | Expected failure rate by age and variant | Raw counts | Counts grow with the installed base |
| Source | Service, telemetry and returns together | Claims only | Claims arrive months later |
| Action | A containment recommendation with affected builds | An alert | Engineers need the affected population |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Dealer name | an identifier |
| Complaint wording | not a cause |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Failure rate versus expected inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: exposure adjusted. |
| Telemetry fault codes inputs | Quality engineering | ERP and production planning | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: per firmware. |
| Return reason mix inputs | Reliability and maintenance | CMMS or EAM maintenance system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: coded reasons. |
| Build attributes inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from genealogy. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: field_failure_early_warning_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: failure_rate_versus_expected, type: double, nullable: false }
    - { name: telemetry_fault_codes, type: double, nullable: false }
    - { name: return_reason_mix, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Failure rate versus expected and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Telemetry fault codes against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Failure rate versus expected, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE field_failure_early_warning_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE field_failure_early_warning_outputs (
  run_id TEXT NOT NULL REFERENCES field_failure_early_warning_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE field_failure_early_warning_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE field_failure_early_warning_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Field Failure Early Warning": Detect emerging field failure patterns for a product from service, telemetry and return data weeks before warranty claims show them. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Failures are rare and degrade before they happen | Machines usually show vibration, temperature, current or pressure drift before they fail, but failures are rare and maintenance often replaces parts early, which hides the failure labels. | Training on few failures without care produces models that alarm constantly or never. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Failure rate versus expected | Observed to expected ratio by variant and age. Primary signal. | Leakage risk to design against: Exposure adjusted. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is expected failure rate by age and variant; the common noise is raw counts. | Counts grow with the installed base. |

**Ask the experts**

- [ ] What exactly does "Alert when a failure mode exceeds the expected rate with a confidence level" mean in practice for field failure early warning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Failure rate versus expected" and "Telemetry fault codes", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time from first failure to action" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: raw counts, and who can confirm the cut-off times and splits?
- [ ] How often does "Firmware release" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| RUL | Remaining useful life: the time before a component should be replaced. |
| Predictive maintenance | Servicing equipment based on predicted condition instead of a fixed schedule. |
| FMEA | Failure mode and effects analysis: a structured review of how a design or process can fail. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| Historian | A database for time-stamped sensor data from plants. |
| Vibration analysis | Using vibration signals to detect machine faults. |
| MTBF | Mean time between failures. |
| Digital twin | A model of a machine or plant kept in step with real data. |
| Lot traceability | Tracking which materials and settings went into each lot. |
| Edge gateway | A device that collects and pre-processes plant data near the machines. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
