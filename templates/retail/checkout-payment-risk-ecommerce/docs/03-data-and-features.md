# E-Commerce Checkout Risk (Card-Not-Present): data and feature specification

> Generated from the blueprint `retail/checkout-payment-risk-ecommerce` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** E-Commerce Checkout Risk (Card-Not-Present) · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "E-Commerce Checkout Risk (Card-Not-Present)": Approve genuine orders instantly and block fraudulent card-not-present orders before fulfilment, optimising profit not just fraud rate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on approved orders only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Shipping-billing distance | geodesic distance and mismatch flags | Drop-shipping fraud pattern | Address normalisation as-of |   |   |   |
| Email-device-card entity degree | distinct values per entity within 7 days | Resource sharing | Time window before order |   |   |   |
| Order velocity per identity cluster | orders per cluster in last hour | Burst attack | Cluster membership as-of |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Economics | Profit-based thresholds using margin and chargeback cost | Fixed fraud-probability cutoff | A cutoff ignores order value and margin |
| Identity | Linkage across email, device, address and card | Order-level features only | Fraudsters reuse infrastructure |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Product count in cart | weak |
| Browser language | spoofed |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Shipping-billing distance inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: address normalisation as-of. |
| Email-device-card entity degree inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: time window before order. |
| Order velocity per identity cluster inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: cluster membership as-of. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: checkout_payment_risk_ecommerce_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: shipping_billing_distance, type: double, nullable: false }
    - { name: email_device_card_entity_degree, type: double, nullable: false }
    - { name: order_velocity_per_identity_cluster, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Shipping-billing distance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Email-device-card entity degree against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Shipping-billing distance, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DataCo Smart Supply Chain | https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis | See the dataset page; free Kaggle login | 180K order lines with shipping modes, delivery status, late-delivery risk and customers | Synthetic-looking and single company; use for pipeline work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE checkout_payment_risk_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  shipping_billing_distance          DOUBLE PRECISION,
  email_device_card_entity_degree    DOUBLE PRECISION,
  order_velocity_per_identity_cluster DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE checkout_payment_risk_decisions (
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
CREATE TABLE checkout_payment_risk_labels (
  decision_id    UUID        NOT NULL REFERENCES checkout_payment_risk_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "E-Commerce Checkout Risk (Card-Not-Present)": Approve genuine orders instantly and block fraudulent card-not-present orders before fulfilment, optimising profit not just fraud rate. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Trust and safety in marketplaces | Marketplaces face fake reviews, counterfeit goods, seller fraud, return abuse and checkout payment fraud. Attackers adapt, ground truth is partial, and enforcement affects honest sellers and buyers. | Precision matters as much as recall because every false action penalises a real seller or shopper. |
| Fulfilment, delivery promises and returns | Orders are routed to warehouses or stores, shipped and sometimes returned. A delivery promise shown at checkout must be one the network can keep; reverse logistics decides whether to resell, refurbish or liquidate a return. | Promising too early causes late deliveries and complaints; promising too late loses conversion, so errors are asymmetric. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Shipping-billing distance | Geodesic distance and mismatch flags. Drop-shipping fraud pattern. | Leakage risk to design against: Address normalisation as-of. |
| A signal-versus-noise trap in this use case: Economics | The true signal is profit-based thresholds using margin and chargeback cost; the common noise is fixed fraud-probability cutoff. | A cutoff ignores order value and margin. |

**Ask the experts**

- [ ] What exactly does "Decision under 70 ms" mean in practice for e-commerce checkout risk (card-not-present): who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Shipping-billing distance" and "Email-device-card entity degree", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fraud losses as percent of GMV" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on approved orders only, and who can confirm the cut-off times and splits?
- [ ] How often does "Chargeback labels arrive 60 days late" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Click-and-collect | Ordering online and picking up in store. |
| Shrinkage | Inventory lost to theft, damage or error between purchase and sale. |
| Chargeback | A payment reversed after the customer disputes it with their bank. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Leave-last-out | Evaluation that hides each session's final item and asks the model to predict it from the rest. |
| AOV | Average order value: revenue divided by the number of orders. |
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Basket | The set of items in a customer's cart or order; basket analysis finds items bought together. |
| Delivery promise | The delivery date or window shown to the customer at checkout. |
| Dark store | A shop or warehouse used only for fulfilling online orders. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
