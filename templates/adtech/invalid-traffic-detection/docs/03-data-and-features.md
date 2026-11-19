# Invalid Traffic (IVT) Detection: data and feature specification

> Generated from the blueprint `adtech/invalid-traffic-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Invalid Traffic (IVT) Detection · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Invalid Traffic (IVT) Detection": Identify bot, hijacked-device and click-farm traffic across impressions and clicks before billing and bidding on it. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from detected fraud.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| IP and device request velocity | requests per minute per entity | Bots are fast | Window before request |   |   |   |
| Click-to-install time distribution | time between click and install | Click injection | Matured installs |   |   |   |
| Traffic source anomaly score | deviation from publisher historical patterns | Site fraud | Baselines |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Scale | Aggregate traffic-pattern features (per IP, device, app) | Per-event rules | Individual events look human, the aggregates do not |
| Adversary | Retrain on new tactics frequently | Static models | Fraud evolves in days |

## Features to drop

| Feature | Why it is noise |
|---|---|
| User-agent text | trivially faked |
| Referrer URL | forgeable |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| IP and device request velocity inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: window before request. |
| Click-to-install time distribution inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: matured installs. |
| Traffic source anomaly score inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: baselines. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: invalid_traffic_detection_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: ip_and_device_request_velocity, type: double, nullable: false }
    - { name: click_to_install_time_distribution, type: double, nullable: false }
    - { name: traffic_source_anomaly_score, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on IP and device request velocity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Click-to-install time distribution against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as IP and device request velocity, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| TalkingData AdTracking Fraud Detection | https://www.kaggle.com/c/talkingdata-adtracking-fraud-detection | Competition rules; free Kaggle login | 200 million mobile ad clicks with an app-download label to detect click fraud | Anonymised and from one platform. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE invalid_traffic_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  ip_and_device_request_velocity     DOUBLE PRECISION,
  click_to_install_time_distribution DOUBLE PRECISION,
  traffic_source_anomaly_score       DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE invalid_traffic_detection_decisions (
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
CREATE TABLE invalid_traffic_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES invalid_traffic_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Invalid Traffic (IVT) Detection": Identify bot, hijacked-device and click-farm traffic across impressions and clicks before billing and bidding on it. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fraud, bots and invalid traffic | Click farms, bots and fake installs consume budget and distort models. Detection mixes device and network signals, behavioural patterns and downstream quality signals such as retention or conversion. | Filtering must happen before billing and before model training, or the system learns to pay for fraud. |
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| How an ad auction works | A publisher's page makes an ad request to a supply-side platform and exchange. Demand-side platforms bid on behalf of advertisers, often through the OpenRTB protocol. In a first-price auction the winner pays their bid; in a second-price auction they pay just above the next bid. A floor price sets the minimum. | Your model is one stage inside a hard time limit that the bid request announces, so latency and failure behaviour are part of the design. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: IP and device request velocity | Requests per minute per entity. Bots are fast. | Leakage risk to design against: Window before request. |
| A signal-versus-noise trap in this use case: Scale | The true signal is aggregate traffic-pattern features (per IP, device, app); the common noise is per-event rules. | Individual events look human, the aggregates do not. |

**Ask the experts**

- [ ] What exactly does "Pre-bid decision in 5 ms" mean in practice for invalid traffic (ivt) detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "IP and device request velocity" and "Click-to-install time distribution", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Invalid traffic rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels only from detected fraud, and who can confirm the cut-off times and splits?
- [ ] How often does "Legitimate traffic spike from viral content" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Invalid traffic (IVT) | Clicks and impressions from bots or accidental taps that should not be billed. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| DSP | Demand-side platform, the system advertisers use to buy impressions and where a CTR model usually lives. |
| Ad exchange | A marketplace that connects sellers and buyers and runs the auction. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| GraphSAGE | A GNN that samples and aggregates a node's neighbours so it scales to large graphs. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
