# Ad Quality Score & Landing-Page Experience: data and feature specification

> Generated from the blueprint `adtech/landing-page-quality-score` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Quality Score & Landing-Page Experience · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ad Quality Score & Landing-Page Experience": Score expected landing-page experience and ad quality to rank and price ads, protecting users from deceptive or slow pages. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels reflect only reported pages.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Page load time and layout shift | Core Web Vitals | UX | Lab vs field |   |   |   |
| Content relevance to ad | semantic match | Relevance | Embeddings |   |   |   |
| Post-click return rate | share returning to results quickly | Dissatisfaction | Window |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Experience | Post-click satisfaction signals (bounce, return-to-search) | CTR as quality | CTR rewards clickbait |
| Freshness | Refresh scores on page change | One-time score | Landing pages change after approval |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Domain age | weak |
| Ad ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Page load time and layout shift inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: lab vs field. |
| Content relevance to ad inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: embeddings. |
| Post-click return rate inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: window. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: landing_page_quality_score_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: page_load_time_and_layout_shift, type: double, nullable: false }
    - { name: content_relevance_to_ad, type: double, nullable: false }
    - { name: post_click_return_rate, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Page load time and layout shift and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Content relevance to ad against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Page load time and layout shift, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE landing_page_quality_score_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE landing_page_quality_score_detections (
  frame_id TEXT NOT NULL REFERENCES landing_page_quality_score_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE landing_page_quality_score_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Ad Quality Score & Landing-Page Experience": Score expected landing-page experience and ad quality to rank and price ads, protecting users from deceptive or slow pages. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Pricing models and expected value | Advertisers pay per thousand impressions (CPM), per click (CPC) or per action (CPA). To compare bids on a common scale the system converts everything to expected revenue per thousand impressions (eCPM): for a click-priced bid it is bid times predicted click probability times 1000. | The predicted probability is multiplied by money, so calibration matters as much as ranking. A score that ranks well but is 30% too high overcharges and over-delivers. |
| Privacy and signal loss | Consent rules (GDPR, CCPA), platform changes such as app tracking limits and the phase-out of third-party cookies remove cross-site identifiers. Models rely more on context, first-party signals and aggregated data. | Features you can use today may be unavailable next year; design for graceful loss of signals. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Page load time and layout shift | Core Web Vitals. UX. | Leakage risk to design against: Lab vs field. |
| A signal-versus-noise trap in this use case: Experience | The true signal is post-click satisfaction signals (bounce, return-to-search); the common noise is cTR as quality. | CTR rewards clickbait. |

**Ask the experts**

- [ ] What exactly does "Page scores cached and refreshed" mean in practice for ad quality score & landing-page experience: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Page load time and layout shift" and "Content relevance to ad", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "User complaint rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels reflect only reported pages, and who can confirm the cut-off times and splits?
- [ ] How often does "Page changes content after approval" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Quality score | A platform's estimate of an ad's relevance and landing-page quality that affects its price and rank. |
| Landing page | The page a user reaches after clicking an ad, whose quality affects conversion and cost. |
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Floor price | The lowest price a publisher will accept for an impression. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
