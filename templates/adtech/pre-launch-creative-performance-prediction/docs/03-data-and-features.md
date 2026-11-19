# Pre-Launch Creative Performance Prediction: data and feature specification

> Generated from the blueprint `adtech/pre-launch-creative-performance-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pre-Launch Creative Performance Prediction · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Pre-Launch Creative Performance Prediction": Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training data confounded by budget and targeting.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Visual embedding | image or video encoder embedding | Content | Domain tuning |   |   |   |
| Attention heatmap | saliency prediction | Focus | Model |   |   |   |
| Text-overlay legibility | OCR text size and contrast | Readability | OCR |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Ranking | Rank creatives within campaign/context | Absolute CTR regression | Absolute CTR varies by context far more than by creative |
| Explanation | Attribute-level feedback (focal point, text size) | Opaque score | Designers need actionable guidance |

## Features to drop

| Feature | Why it is noise |
|---|---|
| File size | none |
| Upload timestamp | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Visual embedding inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: domain tuning. |
| Attention heatmap inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: model. |
| Text-overlay legibility inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: OCR. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: pre_launch_creative_performance_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: visual_embedding, type: double, nullable: false }
    - { name: attention_heatmap, type: double, nullable: false }
    - { name: text_overlay_legibility, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Visual embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Attention heatmap against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Visual embedding, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE pre_launch_creative_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE pre_launch_creative_detections (
  frame_id TEXT NOT NULL REFERENCES pre_launch_creative_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE pre_launch_creative_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Pre-Launch Creative Performance Prediction": Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Position, placement and context | The same ad gets very different click rates depending on where it appears (top of the feed versus a sidebar), on the device and on the time of day. Users also look at higher positions more, so observed click rates mix the quality of an ad with how visible it was. | Logs ranked by an old model teach a new model the old ranking unless position is handled explicitly. |
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Feedback loops and exploration | You only observe clicks for ads that were shown, and the ranker decides what is shown. A new ad that is never shown never gets a click rate. Systems therefore keep a small exploration budget and a randomised slice that provides unbiased data. | Without exploration, new creatives are starved and offline evaluation rewards the incumbent ranker. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Visual embedding | Image or video encoder embedding. Content. | Leakage risk to design against: Domain tuning. |
| A signal-versus-noise trap in this use case: Ranking | The true signal is rank creatives within campaign/context; the common noise is absolute CTR regression. | Absolute CTR varies by context far more than by creative. |

**Ask the experts**

- [ ] What exactly does "Cold-start creatives" mean in practice for pre-launch creative performance prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Visual embedding" and "Attention heatmap", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Share of top creatives chosen" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training data confounded by budget and targeting, and who can confirm the cut-off times and splits?
- [ ] How often does "New visual trends shift performance drivers" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cold start | A new ad, user or placement with no history, whose click rate must be guessed from priors and similar items. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Attention metrics | Measures of how long and how much people look at an ad. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| DSP | Demand-side platform, the system advertisers use to buy impressions and where a CTR model usually lives. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Grad-CAM / saliency | Heat maps showing which image regions most influenced a prediction. |
| OCR / text detection | Finding and reading text in images. |
| Shortcut learning | A model using an easy but irrelevant cue that happens to correlate with the label. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Distribution shift | A change in the data a model sees compared with training. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Multiple-instance learning | Learning from a bag of patches with only a bag-level label, as in whole-slide pathology. |
