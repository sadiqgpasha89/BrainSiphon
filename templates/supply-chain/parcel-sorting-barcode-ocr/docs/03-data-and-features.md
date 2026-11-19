# Parcel Sorting: Label Reading & Address OCR: data and feature specification

> Generated from the blueprint `supply-chain/parcel-sorting-barcode-ocr` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Parcel Sorting: Label Reading & Address OCR · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Parcel Sorting: Label Reading & Address OCR": Read barcodes and address text from parcels on fast conveyors with high first-pass read rate to reduce manual coding. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test images with clean labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Barcode decode confidence | decoder checksum success | Reliability | Hardware |   |   |   |
| OCR confidence by field | per-field probabilities | Routing | Calibrated |   |   |   |
| Address validity score | fuzzy match to postal database | Correctness | Database version |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Fallbacks | Barcode first then OCR with address validation | OCR on everything | Barcode is faster and more reliable |
| Validation | Address validation against postal database | Raw OCR text | OCR output often contains plausible but invalid addresses |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Parcel colour | none |
| Belt ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Barcode decode confidence inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: hardware. |
| OCR confidence by field inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibrated. |
| Address validity score inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: database version. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: parcel_sorting_barcode_ocr_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: barcode_decode_confidence, type: double, nullable: false }
    - { name: ocr_confidence_by_field, type: double, nullable: false }
    - { name: address_validity_score, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Barcode decode confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for OCR confidence by field against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Barcode decode confidence, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE parcel_sorting_barcode_ocr_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE parcel_sorting_barcode_ocr_detections (
  frame_id TEXT NOT NULL REFERENCES parcel_sorting_barcode_ocr_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE parcel_sorting_barcode_ocr_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Parcel Sorting: Label Reading & Address OCR": Read barcodes and address text from parcels on fast conveyors with high first-pass read rate to reduce manual coding. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Warehouse and fulfilment operations | Warehouses receive, store, pick, pack and ship. Layout and slotting set walking distance, wave planning groups orders, robots and humans share space, and labour is the main cost. Computer vision reads barcodes, dimensions and damage. | Throughput and labour per order are the business metrics; model accuracy is only useful insofar as it shortens a pick path or avoids a rehandle. |
| Routing, scheduling and optimisation under uncertainty | Vehicle routing, dispatch, slotting, wave planning, yard planning and timetabling are combinatorial optimisation problems. Travel times, demand and service times are uncertain, so plans built on point predictions are optimistic and fragile. | Optimising predictions systematically picks options whose errors are favourable; robust methods add margins and re-plan as reality unfolds. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Barcode decode confidence | Decoder checksum success. Reliability. | Leakage risk to design against: Hardware. |
| A signal-versus-noise trap in this use case: Fallbacks | The true signal is barcode first then OCR with address validation; the common noise is oCR on everything. | Barcode is faster and more reliable. |

**Ask the experts**

- [ ] What exactly does "99.5% read rate" mean in practice for parcel sorting: label reading & address ocr: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Barcode decode confidence" and "OCR confidence by field", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Manual keying rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test images with clean labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Handwritten addresses" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Barcode / OCR | Reading identifiers and printed text from parcels so they can be sorted. |
| Last mile | The final leg of delivery from a local hub to the customer's door, the most expensive part. |
| VRP / VRPTW | Vehicle routing problem and its version with customer time windows. |
| Time window | The interval in which a customer or dock must be served. |
| Freight invoice audit | Checking carrier invoices against contracted rates and actual shipments. |
| OCR / text detection | Finding and reading text in images. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
