# Proof-of-Delivery Photo Verification: data and feature specification

> Generated from the blueprint `supply-chain/proof-of-delivery-photo-verification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Proof-of-Delivery Photo Verification · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Proof-of-Delivery Photo Verification": Verify delivery photos (parcel at door, correct location, no sensitive content) to prevent fraud and disputes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Synthetic fraud unlike real.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Parcel-in-scene detection | parcel detected near door | Delivery evidence | Detector |   |   |   |
| Photo reuse similarity | perceptual hash vs recent photos | Fraud | Window |   |   |   |
| Geotag distance to address | distance between photo location and address | Location proof | GPS accuracy |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Authenticity | Duplicate and reuse detection plus geotag consistency | Visual plausibility alone | Fraudulent drivers reuse photos |
| Privacy | Blur faces and sensitive details at capture | Storing raw images | Privacy breaches create liability |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Photo brightness | environment |
| Phone model | device |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Parcel-in-scene detection inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: detector. |
| Photo reuse similarity inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: window. |
| Geotag distance to address inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: GPS accuracy. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: proof_of_delivery_photo_verification_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: parcel_in_scene_detection, type: double, nullable: false }
    - { name: photo_reuse_similarity, type: double, nullable: false }
    - { name: geotag_distance_to_address, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Parcel-in-scene detection and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Photo reuse similarity against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Parcel-in-scene detection, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE proof_of_delivery_photo_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE proof_of_delivery_photo_detections (
  frame_id TEXT NOT NULL REFERENCES proof_of_delivery_photo_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE proof_of_delivery_photo_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Proof-of-Delivery Photo Verification": Verify delivery photos (parcel at door, correct location, no sensitive content) to prevent fraud and disputes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Estimated time of arrival and delivery promises | ETAs combine routes, traffic, dwell times at stops and historical behaviour. Customers and planners act on them, so under- and over-estimates have different costs, and quantile predictions (a promise at the 90th percentile) are more useful than averages. | A good ETA is calibrated and updates as the shipment moves, not a single early number. |
| Warehouse and fulfilment operations | Warehouses receive, store, pick, pack and ship. Layout and slotting set walking distance, wave planning groups orders, robots and humans share space, and labour is the main cost. Computer vision reads barcodes, dimensions and damage. | Throughput and labour per order are the business metrics; model accuracy is only useful insofar as it shortens a pick path or avoids a rehandle. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Parcel-in-scene detection | Parcel detected near door. Delivery evidence. | Leakage risk to design against: Detector. |
| A signal-versus-noise trap in this use case: Authenticity | The true signal is duplicate and reuse detection plus geotag consistency; the common noise is visual plausibility alone. | Fraudulent drivers reuse photos. |

**Ask the experts**

- [ ] What exactly does "Fast feedback to driver" mean in practice for proof-of-delivery photo verification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Parcel-in-scene detection" and "Photo reuse similarity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Not-received claims" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: synthetic fraud unlike real, and who can confirm the cut-off times and splits?
- [ ] How often does "Poor lighting at night" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Proof of delivery | Evidence, often a photo or signature, that a parcel reached the customer. |
| Last mile | The final leg of delivery from a local hub to the customer's door, the most expensive part. |
| Time window | The interval in which a customer or dock must be served. |
| ETA | Estimated time of arrival of a shipment or vehicle. |
| First-attempt delivery rate | The share of parcels delivered successfully on the first try. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Transfer learning | Starting from a model pretrained on a large image set and adapting it to a small task dataset. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
