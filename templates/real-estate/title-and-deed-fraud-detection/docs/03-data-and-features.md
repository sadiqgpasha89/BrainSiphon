# Title & Deed Fraud Detection: data and feature specification

> Generated from the blueprint `real-estate/title-and-deed-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Title & Deed Fraud Detection · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Title & Deed Fraud Detection": Detect forged deeds, owner impersonation and suspicious transfers before closing or recording. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled cases and many undetected ones make the recall unknowable.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Ownership change speed | days between the first filing and the transfer to a new owner or a loan against the property | Fast transfers are typical of fraud | Legitimate rushed sales exist, so combine with other signals |   |   |   |
| Notary frequency | number of filings by the same notary in the last 30 days compared with their norm | Rings use a small number of notaries | Busy notaries are legitimate, so compare with their norm |   |   |   |
| Vacant or no-mortgage property | flag for property that is vacant or has no mortgage | Fraudsters target properties that nobody is watching | Data on occupancy are incomplete |   |   |   |
| Signature similarity | similarity score of the signature against previous filings by the owner | Detects forged signatures | Image quality and ageing change signatures, so use a threshold with a review |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Pattern | Behavioural patterns of fraud, such as speed and mismatch | A fixed list of rules | Fraudsters adapt to the rules, and a static list is learned and evaded |
| Identity | Verification that the signer is the true owner | The document alone | A forged document can look perfect, and impersonation succeeds when only the paper is checked |
| Network | Networks of notaries, agents and buyers linked across cases | A single deal looked at in isolation | Rings reuse the same notaries and addresses, and no single case shows it |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Parcel number | An identifier that has no link to fraud |
| Document format | The file format differs between submitters and carries no fraud signal |
| Seller name | A name is personal data and does not indicate fraud |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Ownership change speed inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: legitimate rushed sales exist, so combine with other signals. |
| Notary frequency inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: busy notaries are legitimate, so compare with their norm. |
| Vacant or no-mortgage property inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: data on occupancy are incomplete. |
| Signature similarity inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: image quality and ageing change signatures, so use a threshold with a review. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: title_and_deed_fraud_detection_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: ownership_change_speed, type: double, nullable: false }
    - { name: notary_frequency, type: double, nullable: false }
    - { name: vacant_or_no_mortgage_property, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Ownership change speed and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Notary frequency against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Ownership change speed, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE title_and_deed_fraud_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  ownership_change_speed             DOUBLE PRECISION,
  notary_frequency                   DOUBLE PRECISION,
  vacant_or_no_mortgage_property     DOUBLE PRECISION,
  signature_similarity               DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE title_and_deed_fraud_detection_decisions (
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
CREATE TABLE title_and_deed_fraud_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES title_and_deed_fraud_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Title & Deed Fraud Detection": Detect forged deeds, owner impersonation and suspicious transfers before closing or recording. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Transactions, title and fraud | Buying property involves a contract, searches of title and liens, mortgage underwriting, an escrow or closing agent, and recording of the deed. Fraud includes forged deeds, owner impersonation and fake rental ads, and delay comes from missing conditions and lender steps. | Title and closing data are fragmented across parties, so labels are sparse and investigators need evidence, not just scores. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Listing, search and the buyer funnel | A buyer discovers listings on portals, saves and shares them, enquires, views, makes an offer and goes through a mortgage and a closing. Agents hold the listing relationship, and the portal sees search and engagement behaviour but rarely the final sale. | Engagement is a proxy; the outcome you care about (a sale, a lease) is rare, delayed and often outside the portal's data. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Ownership change speed | Days between the first filing and the transfer to a new owner or a loan against the property. Fast transfers are typical of fraud. | Leakage risk to design against: Legitimate rushed sales exist, so combine with other signals. |
| A signal-versus-noise trap in this use case: Pattern | The true signal is behavioural patterns of fraud, such as speed and mismatch; the common noise is a fixed list of rules. | Fraudsters adapt to the rules, and a static list is learned and evaded. |

**Ask the experts**

- [ ] What exactly does "A human investigator reviews every flagged case before action" mean in practice for title & deed fraud detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Ownership change speed" and "Notary frequency", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fraud prevented" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: few labelled cases and many undetected ones make the recall unknowable, and who can confirm the cut-off times and splits?
- [ ] How often does "Elderly owners" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Deed | The legal document that transfers ownership of property. |
| Title | The legal ownership of a property, and the search that checks for liens and defects. |
| Escrow | A neutral third party holding money and documents until the conditions of a sale are met. |
| Lien | A legal claim on a property as security for a debt. |
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Floodplain | Land that is likely to flood in a given event, such as a one-in-a-hundred-year flood. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Motif | A small recurring subgraph pattern such as a cycle or a fan-out. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
