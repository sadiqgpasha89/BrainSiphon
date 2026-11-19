# Brand Lift & Sentiment Tracking: data and feature specification

> Generated from the blueprint `adtech/brand-lift-and-sentiment-tracking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Brand Lift & Sentiment Tracking · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Brand Lift & Sentiment Tracking": Track brand awareness and sentiment from surveys and social/text data and attribute changes to campaigns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Social data not representative.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Exposed minus control lift | survey lift | Effect | Design |   |   |   |
| Aspect sentiment | attribute-level polarity | Insight | Model |   |   |   |
| Volume vs baseline | mention spike z-score | Event | Window |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Causality | Exposed vs control survey design | Pre/post social sentiment | Brand sentiment moves with news not just ads |
| Sentiment | Aspect-level sentiment | Overall polarity | Overall hides which attributes changed |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Follower count | weak |
| Emoji usage | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Exposed minus control lift inputs | Ad platform engineering | Campaign and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: design. |
| Aspect sentiment inputs | Measurement science | Billing and invoicing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: model. |
| Volume vs baseline inputs | Privacy engineering | Identity graph and consent store (CMP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: brand_lift_and_sentiment_tracking_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: exposed_minus_control_lift, type: double, nullable: false }
    - { name: aspect_sentiment, type: double, nullable: false }
    - { name: volume_vs_baseline, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Exposed minus control lift and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Aspect sentiment against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Exposed minus control lift, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FinancialPhraseBank | https://huggingface.co/datasets/takala/financial_phrasebank | CC BY-NC-SA 3.0 (see the page) | About 4,800 financial news sentences labelled positive, neutral or negative | Small and sentence-level; limited to financial news. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Customer Support on Twitter | https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter | See the dataset page; free Kaggle login | About 3 million tweets and replies between customers and company support accounts | Public social posts; informal language. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE brand_lift_and_sentiment_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE brand_lift_and_sentiment_fields (
  document_id TEXT NOT NULL REFERENCES brand_lift_and_sentiment_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE brand_lift_and_sentiment_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Brand Lift & Sentiment Tracking": Track brand awareness and sentiment from surveys and social/text data and attribute changes to campaigns. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Creative, brand safety and ad quality | The ad itself (image, video, copy) affects performance, and unsafe or non-compliant placements harm brands. Generative tools produce variants, and moderation checks copy against policy and context. | Optimising click rate alone rewards clickbait; guardrails for quality, compliance and brand suitability are part of the objective. |
| Fraud, bots and invalid traffic | Click farms, bots and fake installs consume budget and distort models. Detection mixes device and network signals, behavioural patterns and downstream quality signals such as retention or conversion. | Filtering must happen before billing and before model training, or the system learns to pay for fraud. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Exposed minus control lift | Survey lift. Effect. | Leakage risk to design against: Design. |
| A signal-versus-noise trap in this use case: Causality | The true signal is exposed vs control survey design; the common noise is pre/post social sentiment. | Brand sentiment moves with news not just ads. |

**Ask the experts**

- [ ] What exactly does "Survey bias" mean in practice for brand lift & sentiment tracking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Exposed minus control lift" and "Aspect sentiment", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Brand lift per spend" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: social data not representative, and who can confirm the cut-off times and splits?
- [ ] How often does "Viral controversy swamps campaign signal" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Brand lift | The change in awareness, favourability or purchase intent caused by a campaign, measured by surveys. |
| Adstock | The lagged, decaying effect of advertising that continues after the ad is seen. |
| Incrementality | The extra outcome that exists because of advertising, compared with what would have happened anyway. |
| Synthetic control | A weighted blend of untreated regions that mimics a treated region before the test. |
| Brand safety | Keeping ads away from content that could harm the advertiser's reputation. |
| Influencer marketing | Paying content creators to promote products, where audience authenticity matters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Paraphrase robustness | A model giving the same answer to differently worded versions of the same text. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| F1 score | The harmonic mean of precision and recall. |
