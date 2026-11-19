# Duplicate Listing Detection Across Portals: data and feature specification

> Generated from the blueprint `real-estate/duplicate-listing-detection-across-portals` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Duplicate Listing Detection Across Portals · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Duplicate Listing Detection Across Portals": Identify the same property listed by several agents and portals so search shows one entry and statistics count it once. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labelled pairs are easy cases chosen by reviewers, so the test overstates accuracy on hard pairs.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Address match | normalised and geocoded address equality with unit number retained | The strongest single identity signal | Formats differ between portals, so normalise before comparing |   |   |   |
| Image hash similarity | smallest perceptual-hash distance between any pair of photos across two listings | The same photos are reused across portals | Re-edited and cropped images change the hash, so back it with an embedding match |   |   |   |
| Price and size agreement | relative difference in asking price and in floor area against a tolerance | Supports an identity match | Prices change between portals within days, so use a tolerance not equality |   |   |   |
| Agent relation | whether the two listings come from the same broker or agency | Same-agent duplicates are the most common case | Data on agency relationships is incomplete |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Identity | Property identity from normalised address, geocode and image evidence | Text similarity of descriptions | Agents rewrite descriptions for each portal, so the same home reads very differently |
| Merge | A conservative merge that needs agreement of several independent signals | An aggressive merge on a single strong signal | A wrong merge hides a real listing from buyers, which costs the seller a sale |
| Unit | Identity at the level of the individual unit | Building-level identity | Apartments in one building share an address and photos of the lobby but are different homes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Listing ID | An arbitrary key assigned by each portal that cannot match across portals |
| Description order | Sentence order varies with templates and has no bearing on identity |
| Photo count | Differs between portals because of upload limits and not between homes |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Address match inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: formats differ between portals, so normalise before comparing. |
| Image hash similarity inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: re-edited and cropped images change the hash, so back it with an embedding match. |
| Price and size agreement inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: prices change between portals within days, so use a tolerance not equality. |
| Agent relation inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data on agency relationships is incomplete. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: duplicate_listing_detection_across_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: address_match, type: double, nullable: false }
    - { name: image_hash_similarity, type: double, nullable: false }
    - { name: price_and_size_agreement, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Address match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Image hash similarity against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Address match, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE duplicate_listing_detection_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE duplicate_listing_detection_detections (
  frame_id TEXT NOT NULL REFERENCES duplicate_listing_detection_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE duplicate_listing_detection_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Duplicate Listing Detection Across Portals": Identify the same property listed by several agents and portals so search shows one entry and statistics count it once. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Listing, search and the buyer funnel | A buyer discovers listings on portals, saves and shares them, enquires, views, makes an offer and goes through a mortgage and a closing. Agents hold the listing relationship, and the portal sees search and engagement behaviour but rarely the final sale. | Engagement is a proxy; the outcome you care about (a sale, a lease) is rare, delayed and often outside the portal's data. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Address match | Normalised and geocoded address equality with unit number retained. The strongest single identity signal. | Leakage risk to design against: Formats differ between portals, so normalise before comparing. |
| A signal-versus-noise trap in this use case: Identity | The true signal is property identity from normalised address, geocode and image evidence; the common noise is text similarity of descriptions. | Agents rewrite descriptions for each portal, so the same home reads very differently. |

**Ask the experts**

- [ ] What exactly does "A false merge is treated as worse than a missed duplicate" mean in practice for duplicate listing detection across portals: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Address match" and "Image hash similarity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Duplicate rate in search" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labelled pairs are easy cases chosen by reviewers, so the test overstates accuracy on hard pairs, and who can confirm the cut-off times and splits?
- [ ] How often does "Two units same address" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Transfer learning | Starting from a model pretrained on a large image set and adapting it to a small task dataset. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
