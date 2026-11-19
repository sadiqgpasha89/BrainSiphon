# Vehicle Damage Estimation from Photos: data and feature specification

> Generated from the blueprint `fintech/insurance-claim-damage-estimation-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vehicle Damage Estimation from Photos · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Vehicle Damage Estimation from Photos": Estimate repair cost from customer photos within seconds, enabling instant settlement of simple claims. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on estimates instead of final invoices.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Damaged part segmentation | mask and severity per vehicle part | Maps to repair operations | Use a part taxonomy per model year |   |   |   |
| Photo integrity score | EXIF, duplication and manipulation checks | Photo fraud | Reverse-image search against prior claims |   |   |   |
| Vehicle identification | make, model, year from VIN and image | Parts price lookup | Decode VIN before image model |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Coverage | Required photo angles enforced with guided capture | Whatever the customer uploads | Missing angles are the main error source |
| Cost | Part-level damage mapped to repair-shop labour and part prices | End-to-end image-to-cost regression | Prices vary by region and part supplier |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Image aspect ratio | device-specific artefact |
| Weather in the photo | environment, not damage |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Damaged part segmentation inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: use a part taxonomy per model year. |
| Photo integrity score inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: reverse-image search against prior claims. |
| Vehicle identification inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: decode VIN before image model. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: insurance_claim_damage_estimation_vision_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: damaged_part_segmentation, type: double, nullable: false }
    - { name: photo_integrity_score, type: double, nullable: false }
    - { name: vehicle_identification, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Damaged part segmentation and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Photo integrity score against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Damaged part segmentation, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| French Motor Third-Party Liability Claims | https://www.openml.org/d/41214 | Open licence on OpenML; see the dataset page | About 678,000 policies with exposure, claim counts and risk characteristics, the standard example for frequency modelling | One line of business in one country; no claim text, no payments over time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE insurance_claim_damage_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE insurance_claim_damage_detections (
  frame_id TEXT NOT NULL REFERENCES insurance_claim_damage_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE insurance_claim_damage_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Vehicle Damage Estimation from Photos": Estimate repair cost from customer photos within seconds, enabling instant settlement of simple claims. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Insurance: claims, pricing and fraud | Insurers price risk from the expected frequency and severity of claims, collect premiums and pay claims. A loss ratio compares claims paid with premium earned. Claims data are heavy-tailed with many zeros, and fraud ranges from exaggerated claims to organised rings. | Models predict skewed targets (Poisson or Tweedie losses), must avoid unfair discrimination, and claims outcomes take months to settle. |
| The cost asymmetry and the operating point | A missed fraud costs the transaction amount plus fees and handling. A false decline costs the margin, a frustrated customer and sometimes the customer. The business chooses a point on the trade-off, expressed as fraud basis points (fraud loss per 10,000 currency units of sales) and a false-decline rate, not as accuracy. | Metrics like accuracy or ROC-AUC mean nothing at a 0.4% fraud rate. Everything is evaluated at the fixed false-positive rate the business agrees in M0. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Damaged part segmentation | Mask and severity per vehicle part. Maps to repair operations. | Leakage risk to design against: Use a part taxonomy per model year. |
| A signal-versus-noise trap in this use case: Coverage | The true signal is required photo angles enforced with guided capture; the common noise is whatever the customer uploads. | Missing angles are the main error source. |

**Ask the experts**

- [ ] What exactly does "Settlement accuracy within 10%" mean in practice for vehicle damage estimation from photos: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Damaged part segmentation" and "Photo integrity score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Straight-through settlement rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on estimates instead of final invoices, and who can confirm the cut-off times and splits?
- [ ] How often does "Pre-existing damage" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| FNOL | First notice of loss: the first report of an insured event, where claims triage begins. |
| Frequency / severity | How often claims occur and how large each one is; their product is expected loss. |
| Loss ratio | Claims paid divided by premium earned, a core measure of insurance profitability. |
| Subrogation | The insurer's right to recover claim payments from a party responsible for the loss. |
| Clearing and settlement | The batch process after authorisation in which transaction details are exchanged and funds are actually transferred. |
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| Premium | The price a policyholder pays for insurance cover. |
| Telematics | Data from vehicles or devices, such as speed and braking, used to price insurance by behaviour. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
