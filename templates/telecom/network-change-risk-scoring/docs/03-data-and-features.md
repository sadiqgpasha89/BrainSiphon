# Network Change Risk Scoring: data and feature specification

> Generated from the blueprint `telecom/network-change-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Network Change Risk Scoring · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Network Change Risk Scoring": Score each planned network change for the probability that it causes a customer-impacting incident, so reviewers focus approval time on risky changes and safe ones flow quickly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labelling by time overlap.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Blast radius | customers and services behind the target | Higher reach raises risk | Use live inventory |   |   |   |
| Change complexity | number of steps and elements touched in the plan | Complexity raises error odds | Parse from the structured plan |   |   |   |
| Time to peak traffic | minutes between the window and the next busy hour | Late changes hit peak | Use local time |   |   |   |
| Past failure rate of the template | incident rate of this change template over 12 months | Template quality | Exclude the change being scored |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Changes linked to an incident by evidence of causation | Any incident in the same window | Coincident incidents flood the label with noise |
| Context | Change type, target criticality and timing together | Change type alone | Risk depends on where and when the change lands |
| Fairness | Risk from the change not the person | Engineer history as a feature | It punishes people who take on hard changes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Free-text description length | not risk |
| Requester team size | weak link |
| Ticket number | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Blast radius inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: use live inventory. |
| Change complexity inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: parse from the structured plan. |
| Time to peak traffic inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: use local time. |
| Past failure rate of the template inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: exclude the change being scored. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: network_change_risk_scoring_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: blast_radius, type: double, nullable: false }
    - { name: change_complexity, type: double, nullable: false }
    - { name: time_to_peak_traffic, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Blast radius and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Change complexity against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Blast radius, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE network_change_risk_scoring_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  blast_radius                       DOUBLE PRECISION,
  change_complexity                  DOUBLE PRECISION,
  time_to_peak_traffic               DOUBLE PRECISION,
  past_failure_rate_of_the_template  DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE network_change_risk_scoring_decisions (
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
CREATE TABLE network_change_risk_scoring_labels (
  decision_id    UUID        NOT NULL REFERENCES network_change_risk_scoring_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Network Change Risk Scoring": Score each planned network change for the probability that it causes a customer-impacting incident, so reviewers focus approval time on risky changes and safe ones flow quickly. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Capacity is planned for the busy hour | Traffic is forecast per cell and per link for the busiest period, with growth from new devices, video and events. Spectrum and backhaul upgrades take months, so forecasts must be early and carry uncertainty. | Planning on average load causes congestion at peak, while over-building wastes capital. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Blast radius | Customers and services behind the target. Higher reach raises risk. | Leakage risk to design against: Use live inventory. |
| A signal-versus-noise trap in this use case: Label | The true signal is changes linked to an incident by evidence of causation; the common noise is any incident in the same window. | Coincident incidents flood the label with noise. |

**Ask the experts**

- [ ] What exactly does "Scores must be explainable to the change board" mean in practice for network change risk scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Blast radius" and "Change complexity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Change-induced incidents" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labelling by time overlap, and who can confirm the cut-off times and splits?
- [ ] How often does "Emergency change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| Core network | The central part of the network that handles authentication, session control and routing. |
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| NFV | Network function virtualisation: running network functions as software on standard servers. |
| SDN | Software-defined networking: separating control from forwarding so the network is programmable. |
| Network slicing | Dividing a 5G network into virtual networks with different performance guarantees. |
| SIM swap | Moving a number to a new SIM, a step abused in account takeover. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
