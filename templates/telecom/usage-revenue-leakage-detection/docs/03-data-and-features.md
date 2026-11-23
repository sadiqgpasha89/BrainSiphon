# Usage & Rating Revenue Leakage Detection: data and feature specification

> Generated from the blueprint `telecom/usage-revenue-leakage-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Usage & Rating Revenue Leakage Detection · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Usage & Rating Revenue Leakage Detection": Find usage that was delivered but not billed or billed incorrectly across mediation, rating and billing so revenue assurance recovers lost revenue and fixes the root cause. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using total bill checks only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Record count ratio between steps | records in versus out per day and service | Loss at a hop | Align on the same period |   |   |   |
| Rate plan assignment gaps | usage without a matching rating rule | Common cause | Needs the catalogue history |   |   |   |
| Unrated or zero-value share | share of usage with zero charge by product | Leak signal | Per product |   |   |   |
| Change adjacency | catalogue or system changes near the shift | Explains the onset | Needs change records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Reconcile | Counts and values compared at each hop | Final bill totals only | Leakage hides in the middle steps |
| Baseline | Expected volume by service and period | Fixed tolerance | Volumes shift with seasons and launches |
| Cause | Leakage tied to a rule, product or interface | A list of anomalies | Teams need the cause to fix it |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Invoice number | an identifier |
| Region alone | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Record count ratio between steps inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: align on the same period. |
| Rate plan assignment gaps inputs | OSS/BSS platform team | BSS: CRM, order management and billing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: needs the catalogue history. |
| Unrated or zero-value share inputs | Customer data office | Network element configuration and orchestration layer | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: per product. |
| Change adjacency inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: needs change records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: usage_revenue_leakage_detection_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: record_count_ratio_between_steps, type: double, nullable: false }
    - { name: rate_plan_assignment_gaps, type: double, nullable: false }
    - { name: unrated_or_zero_value_share, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Record count ratio between steps and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rate plan assignment gaps against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Record count ratio between steps, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE usage_revenue_leakage_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE usage_revenue_leakage_outputs (
  run_id TEXT NOT NULL REFERENCES usage_revenue_leakage_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE usage_revenue_leakage_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE usage_revenue_leakage_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Usage & Rating Revenue Leakage Detection": Find usage that was delivered but not billed or billed incorrectly across mediation, rating and billing so revenue assurance recovers lost revenue and fixes the root cause. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Revenue assurance finds money the operator should have billed | Usage records move through mediation, rating and billing, and errors in tariffs, mappings or partner settlements cause under-billing and leakage. Reconciling the stages finds the gaps. | Small percentage errors across millions of records become large sums, and some errors are invisible to the customer. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Record count ratio between steps | Records in versus out per day and service. Loss at a hop. | Leakage risk to design against: Align on the same period. |
| A signal-versus-noise trap in this use case: Reconcile | The true signal is counts and values compared at each hop; the common noise is final bill totals only. | Leakage hides in the middle steps. |

**Ask the experts**

- [ ] What exactly does "Reconciliation across network, mediation and billing counts" mean in practice for usage & rating revenue leakage detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Record count ratio between steps" and "Rate plan assignment gaps", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Revenue recovered" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using total bill checks only, and who can confirm the cut-off times and splits?
- [ ] How often does "Product launch" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Rating | Applying tariffs to usage records to calculate charges. |
| Mediation | The system that collects and normalises usage records before billing. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| ARPU | Average revenue per user: revenue divided by the number of subscribers in a period. |
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| Alarm correlation | Grouping related alarms to find a common cause. |
| Root cause analysis | Finding the underlying fault behind a set of symptoms. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Level shift | An abrupt, lasting change in a series' average. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
