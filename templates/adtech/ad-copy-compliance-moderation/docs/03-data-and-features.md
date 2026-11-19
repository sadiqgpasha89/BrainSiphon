# Ad Copy & Creative Compliance Moderation: data and feature specification

> Generated from the blueprint `adtech/ad-copy-compliance-moderation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Copy & Creative Compliance Moderation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ad Copy & Creative Compliance Moderation": Detect policy-violating ads (misleading claims, prohibited products, restricted categories) at submission time with advertiser-facing explanations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from past inconsistent reviewers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Policy category scores | multi-label scores | Routing | Calibration |   |   |   |
| Claim detection | health or financial claim detector | Regulated claims | Taxonomy |   |   |   |
| Advertiser trust tier | history of violations | Context | History |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Policy | Per-policy classifiers with region thresholds | Single violation score | Policies differ by market and category |
| Evasion | Robustness to obfuscated text and imagery | Keyword filters | Advertisers obfuscate to evade |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Ad ID | none |
| Bid | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Policy category scores inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibration. |
| Claim detection inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: taxonomy. |
| Advertiser trust tier inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: history. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ad_copy_compliance_moderation_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: policy_category_scores, type: double, nullable: false }
    - { name: claim_detection, type: double, nullable: false }
    - { name: advertiser_trust_tier, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Policy category scores and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Claim detection against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Policy category scores, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FinancialPhraseBank | https://huggingface.co/datasets/takala/financial_phrasebank | CC BY-NC-SA 3.0 (see the page) | About 4,800 financial news sentences labelled positive, neutral or negative | Small and sentence-level; limited to financial news. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE ad_copy_compliance_moderation_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE ad_copy_compliance_moderation_detections (
  frame_id TEXT NOT NULL REFERENCES ad_copy_compliance_moderation_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE ad_copy_compliance_moderation_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Ad Copy & Creative Compliance Moderation": Detect policy-violating ads (misleading claims, prohibited products, restricted categories) at submission time with advertiser-facing explanations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Creative, brand safety and ad quality | The ad itself (image, video, copy) affects performance, and unsafe or non-compliant placements harm brands. Generative tools produce variants, and moderation checks copy against policy and context. | Optimising click rate alone rewards clickbait; guardrails for quality, compliance and brand suitability are part of the objective. |
| Position, placement and context | The same ad gets very different click rates depending on where it appears (top of the feed versus a sidebar), on the device and on the time of day. Users also look at higher positions more, so observed click rates mix the quality of an ad with how visible it was. | Logs ranked by an old model teach a new model the old ranking unless position is handled explicitly. |
| Feedback loops and exploration | You only observe clicks for ads that were shown, and the ranker decides what is shown. A new ad that is never shown never gets a click rate. Systems therefore keep a small exploration budget and a randomised slice that provides unbiased data. | Without exploration, new creatives are starved and offline evaluation rewards the incumbent ranker. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Policy category scores | Multi-label scores. Routing. | Leakage risk to design against: Calibration. |
| A signal-versus-noise trap in this use case: Policy | The true signal is per-policy classifiers with region thresholds; the common noise is single violation score. | Policies differ by market and category. |

**Ask the experts**

- [ ] What exactly does "Region-specific rules" mean in practice for ad copy & creative compliance moderation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Policy category scores" and "Claim detection", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Policy violation exposure" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels from past inconsistent reviewers, and who can confirm the cut-off times and splits?
- [ ] How often does "New regulation introduces a restricted category" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Calibration | Predicted probabilities matching observed frequencies, so that ads scored at 3% really are clicked about 3% of the time. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| DSP | Demand-side platform, the system advertisers use to buy impressions and where a CTR model usually lives. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Data augmentation | Creating altered copies of training images (flips, brightness) so the model becomes robust. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
