# Core Signalling Storm Detection: data and feature specification

> Generated from the blueprint `telecom/core-signalling-storm-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Core Signalling Storm Detection · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Core Signalling Storm Detection": Detect abnormal signalling surges in the mobile core early enough to throttle or isolate the source before it overloads authentication and session functions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Global thresholds.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Rate versus expected | ratio of signalling per minute to the time-adjusted baseline | Surge signal | Baseline per function |   |   |   |
| Source concentration | share of events from the top 1% of sources | Targets the cause | Needs pseudonymous grouping |   |   |   |
| Failure and retry ratio | ratio of rejects and retries to requests | Positive feedback loop sign | Tune per message type |   |   |   |
| Message mix shift | change in the mix of attach, auth and session requests | Pinpoints the function | Normalise by day type |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | Per-function and per-source rate baselines by time of day | One global threshold | Healthy peaks look like storms |
| Source | Concentration of load on a few devices or an app | Total rate alone | Misbehaving apps and devices cause most storms |
| Action | Throttle the source class not everyone | Cell or core-wide throttle | Broad throttles hurt innocent users |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Subscriber name | irrelevant and private |
| Server hostname | encodes location only |
| Raw event count without baseline | follows traffic |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Rate versus expected inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: baseline per function. |
| Source concentration inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs pseudonymous grouping. |
| Failure and retry ratio inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: tune per message type. |
| Message mix shift inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: normalise by day type. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: core_signalling_storm_detection_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: rate_versus_expected, type: double, nullable: false }
    - { name: source_concentration, type: double, nullable: false }
    - { name: failure_and_retry_ratio, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Rate versus expected and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Source concentration against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Rate versus expected, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE core_signalling_storm_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  rate_versus_expected               DOUBLE PRECISION,
  source_concentration               DOUBLE PRECISION,
  failure_and_retry_ratio            DOUBLE PRECISION,
  message_mix_shift                  DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE core_signalling_storm_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE core_signalling_storm_labels (
  decision_id    UUID        NOT NULL REFERENCES core_signalling_storm_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Core Signalling Storm Detection": Detect abnormal signalling surges in the mobile core early enough to throttle or isolate the source before it overloads authentication and session functions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Capacity is planned for the busy hour | Traffic is forecast per cell and per link for the busiest period, with growth from new devices, video and events. Spectrum and backhaul upgrades take months, so forecasts must be early and carry uncertainty. | Planning on average load causes congestion at peak, while over-building wastes capital. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Rate versus expected | Ratio of signalling per minute to the time-adjusted baseline. Surge signal. | Leakage risk to design against: Baseline per function. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is per-function and per-source rate baselines by time of day; the common noise is one global threshold. | Healthy peaks look like storms. |

**Ask the experts**

- [ ] What exactly does "Detection decision under 80 ms per window" mean in practice for core signalling storm detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Rate versus expected" and "Source concentration", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Core overload minutes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: global thresholds, and who can confirm the cut-off times and splits?
- [ ] How often does "Firmware update storm" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Core network | The central part of the network that handles authentication, session control and routing. |
| Alarm correlation | Grouping related alarms to find a common cause. |
| KPI | Key performance indicator: a measured value used to track cell or service health. |
| IMS | IP multimedia subsystem: the core that supports voice and messaging over IP. |
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| ARPU | Average revenue per user: revenue divided by the number of subscribers in a period. |
| Churn | The share of subscribers who leave in a period. |
| PRB | Physical resource block: the unit of radio capacity allocated to users in a cell. |
| Handover | Moving an active session from one cell to another without dropping it. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Level shift | An abrupt, lasting change in a series' average. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
