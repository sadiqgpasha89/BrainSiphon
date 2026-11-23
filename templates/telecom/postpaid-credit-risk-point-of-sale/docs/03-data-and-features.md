# Postpaid Credit Risk at Point of Sale: data and feature specification

> Generated from the blueprint `telecom/postpaid-credit-risk-point-of-sale` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Postpaid Credit Risk at Point of Sale · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Postpaid Credit Risk at Point of Sale": Decide on credit limits and deposits for postpaid and device-financing applicants at the point of sale with explainable, fair credit risk scores. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training only on accepted applicants.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Bureau score and trade lines | score and delinquency history | Core risk signal | Official sources |   |   |   |
| Existing relationship | tenure and payment record with the operator | Strong behavioural signal | Own data |   |   |   |
| Application consistency | declared versus bureau data | Fraud and risk | Use match quality |   |   |   |
| Device financing exposure | total outstanding device credit | Exposure | Per customer |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Default or serious delinquency within 12 months | Early late payments | Short delays are common and benign |
| Population | Accepted and declined applicants with reject inference | Accepted customers only | Declined applicants hide risk |
| Fairness | Disparity checks in each release | Accuracy only | Credit models face legal tests |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Applicant name | irrelevant and private |
| Application time alone | weak link |
| Store brand alone | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Bureau score and trade lines inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: official sources. |
| Existing relationship inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: own data. |
| Application consistency inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: use match quality. |
| Device financing exposure inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: per customer. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: postpaid_credit_risk_point_of_sale_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: bureau_score_and_trade_lines, type: double, nullable: false }
    - { name: existing_relationship, type: double, nullable: false }
    - { name: application_consistency, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Bureau score and trade lines and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Existing relationship against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Bureau score and trade lines, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE postpaid_credit_risk_point_of_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  bureau_score_and_trade_lines       DOUBLE PRECISION,
  existing_relationship              DOUBLE PRECISION,
  application_consistency            DOUBLE PRECISION,
  device_financing_exposure          DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE postpaid_credit_risk_point_of_decisions (
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
CREATE TABLE postpaid_credit_risk_point_of_labels (
  decision_id    UUID        NOT NULL REFERENCES postpaid_credit_risk_point_of_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Postpaid Credit Risk at Point of Sale": Decide on credit limits and deposits for postpaid and device-financing applicants at the point of sale with explainable, fair credit risk scores. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Churn has drivers and a cost to prevent | Subscribers leave because of price, network quality, service failures, competitor offers and contract end dates. Retention offers cost margin, so they should go to customers who are both at risk and persuadable. | Predicting only who will leave wastes offers on customers who would have stayed or who cannot be saved. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Bureau score and trade lines | Score and delinquency history. Core risk signal. | Leakage risk to design against: Official sources. |
| A signal-versus-noise trap in this use case: Label | The true signal is default or serious delinquency within 12 months; the common noise is early late payments. | Short delays are common and benign. |

**Ask the experts**

- [ ] What exactly does "Decision within 80 ms" mean in practice for postpaid credit risk at point of sale: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Bureau score and trade lines" and "Existing relationship", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Bad debt rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training only on accepted applicants, and who can confirm the cut-off times and splits?
- [ ] How often does "Thin-file applicant" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Core network | The central part of the network that handles authentication, session control and routing. |
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| QoE | Quality of experience: how good a service feels to the user, such as video smoothness. |
| KPI | Key performance indicator: a measured value used to track cell or service health. |
| Backhaul | The link that carries traffic from a cell site to the core network. |
| TM Forum | The industry body that publishes telecom process and API standards. |
| Latency | The delay between sending and receiving data. |
| Jitter | Variation in packet delay that hurts voice and video. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
