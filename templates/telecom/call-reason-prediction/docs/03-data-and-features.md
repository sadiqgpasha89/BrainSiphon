# Call Reason Prediction: data and feature specification

> Generated from the blueprint `telecom/call-reason-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Call Reason Prediction · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Call Reason Prediction": Predict why a customer is contacting care as they enter the queue so the right skill, content or self-service step is offered immediately. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on menu choices.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Recent bill event | days since the last bill and a bill change flag | Billing reasons | As at contact time |   |   |   |
| Open network incident near the customer | whether a fault is open near their serving cells | Service reasons | From live incidents |   |   |   |
| Recent order or plan change | order status and days since change | Activation and plan reasons | From order management |   |   |   |
| Prior contact reason | the previous coded reason in 30 days | Repeat contacts | Use coded not free text |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | The reason the agent coded after resolution | Menu choice at entry | Menu choices are guesses |
| Recency | Events from the last few days | Lifetime history | Reasons are driven by recent events |
| Scope | A fixed reason taxonomy | Free-form reasons | Reports need a stable taxonomy |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Language of the greeting | not the reason |
| Handset model alone | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Recent bill event inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: as at contact time. |
| Open network incident near the customer inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from live incidents. |
| Recent order or plan change inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from order management. |
| Prior contact reason inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use coded not free text. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: call_reason_prediction_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: recent_bill_event, type: double, nullable: false }
    - { name: open_network_incident_near_the_customer, type: double, nullable: false }
    - { name: recent_order_or_plan_change, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Recent bill event and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Open network incident near the customer against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Recent bill event, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Avazu Click-Through Rate Prediction | https://www.kaggle.com/c/avazu-ctr-prediction | Competition rules; free Kaggle login | About 40 million mobile ad impressions over 10 days with hourly timestamps | No position or dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE call_reason_prediction_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  recent_bill_event                  DOUBLE PRECISION,
  open_network_incident_near_the_customer DOUBLE PRECISION,
  recent_order_or_plan_change        DOUBLE PRECISION,
  prior_contact_reason               DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE call_reason_prediction_decisions (
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
CREATE TABLE call_reason_prediction_labels (
  decision_id    UUID        NOT NULL REFERENCES call_reason_prediction_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Call Reason Prediction": Predict why a customer is contacting care as they enter the queue so the right skill, content or self-service step is offered immediately. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Provisioning turns an order into a working service | Activation spans order capture, inventory, number and SIM assignment, network configuration and billing set-up across OSS and BSS systems. Failures often come from data mismatches between those systems. | Fall-out in the middle of a multi-system flow leaves a paying customer without service, so orders need compensating steps and clear status. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Recent bill event | Days since the last bill and a bill change flag. Billing reasons. | Leakage risk to design against: As at contact time. |
| A signal-versus-noise trap in this use case: Label | The true signal is the reason the agent coded after resolution; the common noise is menu choice at entry. | Menu choices are guesses. |

**Ask the experts**

- [ ] What exactly does "Prediction within 60 ms of the contact starting" mean in practice for call reason prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Recent bill event" and "Open network incident near the customer", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Transfers per contact" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on menu choices, and who can confirm the cut-off times and splits?
- [ ] How often does "New product launch" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| Provisioning | Configuring the network and systems so a purchased service works. |
| Core network | The central part of the network that handles authentication, session control and routing. |
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| MTTR | Mean time to repair: the average time from fault to restored service. |
| Order fall-out | An order that fails part way through a multi-system flow. |
| Trouble ticket | A record of a fault or complaint that tracks diagnosis and repair. |
| VoLTE | Voice over LTE: voice calls carried over the 4G data network. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
