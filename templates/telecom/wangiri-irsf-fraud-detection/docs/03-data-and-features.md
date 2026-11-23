# Wangiri & Premium-Rate Fraud Detection: data and feature specification

> Generated from the blueprint `telecom/wangiri-irsf-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wangiri & Premium-Rate Fraud Detection · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Wangiri & Premium-Rate Fraud Detection": Detect call-back, premium-rate and international revenue share fraud in near real time so fraudulent traffic is stopped before large bills and settlement losses accrue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Account blocks for call-back fraud.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Destination risk score | fraud rate of the destination range from recent weeks | Targets the fraud route | Update daily |   |   |   |
| Calls per minute spike | calls per minute against the account's baseline | Burst signal | Account baseline |   |   |   |
| Missed call to call-back ratio | inbound missed calls followed by outbound calls | Wangiri pattern | Per account |   |   |   |
| Revenue share exposure | minutes and cost to the suspected number range | Loss estimate | From rating |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Pattern | Bursts to premium or high-risk destinations | Total international spend | Heavy genuine callers look the same on spend |
| Speed | Detection inside minutes | Next-day batch | Fraud losses accrue per minute |
| Action | Block the destination range and not the customer | Block the account | Customers are victims in call-back fraud |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Plan name alone | weak link |
| Time zone of destination | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Destination risk score inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: update daily. |
| Calls per minute spike inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: account baseline. |
| Missed call to call-back ratio inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: per account. |
| Revenue share exposure inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from rating. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: wangiri_irsf_fraud_detection_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: destination_risk_score, type: double, nullable: false }
    - { name: calls_per_minute_spike, type: double, nullable: false }
    - { name: missed_call_to_call_back_ratio, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Destination risk score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Calls per minute spike against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Destination risk score, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE wangiri_irsf_fraud_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  destination_risk_score             DOUBLE PRECISION,
  calls_per_minute_spike             DOUBLE PRECISION,
  missed_call_to_call_back_ratio     DOUBLE PRECISION,
  revenue_share_exposure             DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE wangiri_irsf_fraud_detection_decisions (
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
CREATE TABLE wangiri_irsf_fraud_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES wangiri_irsf_fraud_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Wangiri & Premium-Rate Fraud Detection": Detect call-back, premium-rate and international revenue share fraud in near real time so fraudulent traffic is stopped before large bills and settlement losses accrue. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Revenue assurance finds money the operator should have billed | Usage records move through mediation, rating and billing, and errors in tariffs, mappings or partner settlements cause under-billing and leakage. Reconciling the stages finds the gaps. | Small percentage errors across millions of records become large sums, and some errors are invisible to the customer. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Destination risk score | Fraud rate of the destination range from recent weeks. Targets the fraud route. | Leakage risk to design against: Update daily. |
| A signal-versus-noise trap in this use case: Pattern | The true signal is bursts to premium or high-risk destinations; the common noise is total international spend. | Heavy genuine callers look the same on spend. |

**Ask the experts**

- [ ] What exactly does "Alert within 5 minutes of the pattern starting" mean in practice for wangiri & premium-rate fraud detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Destination risk score" and "Calls per minute spike", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fraud loss per month" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: account blocks for call-back fraud, and who can confirm the cut-off times and splits?
- [ ] How often does "New fraud destination" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| Mediation | The system that collects and normalises usage records before billing. |
| Interconnect | Paying and settling traffic between operators. |
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| ARPU | Average revenue per user: revenue divided by the number of subscribers in a period. |
| Backhaul | The link that carries traffic from a cell site to the core network. |
| Roaming | Using a network other than the home operator while travelling. |
| SIM swap | Moving a number to a new SIM, a step abused in account takeover. |
| TM Forum | The industry body that publishes telecom process and API standards. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
