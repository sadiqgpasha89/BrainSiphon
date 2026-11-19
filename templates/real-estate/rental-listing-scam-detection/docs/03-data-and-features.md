# Rental Listing Scam Detection: data and feature specification

> Generated from the blueprint `real-estate/rental-listing-scam-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Rental Listing Scam Detection · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Rental Listing Scam Detection": Detect fake rental listings and advance-fee scams at posting time using text, images, price and account behaviour. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: The data contain reported scams only, which are the ones that victims noticed.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Image reuse | perceptual-hash match against an index of images seen in other listings and on other sites | Stolen photos are the most common scam sign | Legitimate agents reuse images across their own listings |   |   |   |
| Price vs market | ratio of the asking rent to the median rent of similar homes nearby | Prices well below market are a lure | Rent control creates legitimate low rents |   |   |   |
| Account age and velocity | number of listings posted in the first 24 hours of an account's life | New accounts that post many listings are suspicious | Legitimate agencies onboard in bulk |   |   |   |
| Contact pattern | share of messages that push to move off the platform or request payment | Scammers want to leave the platform quickly | Uses message text, so apply privacy controls |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Behaviour | Account and posting behaviour such as age, velocity and contact pattern | Text alone | Scammers reuse photos and templates but rewrite the words, so text alone is evaded |
| Price | Price compared with similar homes in the same area | The absolute price | A rent that is too good to be true for the area is the lure, not the amount |
| Network | Accounts linked by shared images, devices and contact details | A single listing seen on its own | Scam rings run many listings from many accounts, and each looks small |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Title style | Writing style varies and is easily copied by scammers |
| Photo count | Not a reliable differentiator once image reuse is measured |
| Time posted | Weak relation, since scams are posted at all hours |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Image reuse inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: legitimate agents reuse images across their own listings. |
| Price vs market inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: rent control creates legitimate low rents. |
| Account age and velocity inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: legitimate agencies onboard in bulk. |
| Contact pattern inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: uses message text, so apply privacy controls. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: rental_listing_scam_detection_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: image_reuse, type: double, nullable: false }
    - { name: price_vs_market, type: double, nullable: false }
    - { name: account_age_and_velocity, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Image reuse and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Price vs market against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Image reuse, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Inside Airbnb | https://insideairbnb.com/get-the-data/ | Creative Commons CC0 1.0 for most cities (check each city page) | Listing, calendar and review data for many cities, scraped from public Airbnb pages and refreshed regularly | Scraped, not official; calendar availability does not equal bookings and prices are asking prices. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE rental_listing_scam_detection_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE rental_listing_scam_detection_detections (
  frame_id TEXT NOT NULL REFERENCES rental_listing_scam_detection_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE rental_listing_scam_detection_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Rental Listing Scam Detection": Detect fake rental listings and advance-fee scams at posting time using text, images, price and account behaviour. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Listing, search and the buyer funnel | A buyer discovers listings on portals, saves and shares them, enquires, views, makes an offer and goes through a mortgage and a closing. Agents hold the listing relationship, and the portal sees search and engagement behaviour but rarely the final sale. | Engagement is a proxy; the outcome you care about (a sale, a lease) is rare, delayed and often outside the portal's data. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Image reuse | Perceptual-hash match against an index of images seen in other listings and on other sites. Stolen photos are the most common scam sign. | Leakage risk to design against: Legitimate agents reuse images across their own listings. |
| A signal-versus-noise trap in this use case: Behaviour | The true signal is account and posting behaviour such as age, velocity and contact pattern; the common noise is text alone. | Scammers reuse photos and templates but rewrite the words, so text alone is evaded. |

**Ask the experts**

- [ ] What exactly does "Decision within 80 ms when a listing is submitted" mean in practice for rental listing scam detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Image reuse" and "Price vs market", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Scam exposure" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: the data contain reported scams only, which are the ones that victims noticed, and who can confirm the cut-off times and splits?
- [ ] How often does "Legit low price" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Delinquency | A tenant being late on rent beyond the grace period. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Effective rent | Rent net of incentives such as free months, spread across the lease term. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Motif | A small recurring subgraph pattern such as a cycle or a fan-out. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
