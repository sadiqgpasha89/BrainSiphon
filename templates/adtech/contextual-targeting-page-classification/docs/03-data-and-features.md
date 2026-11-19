# Contextual Targeting & Page Classification: data and feature specification

> Generated from the blueprint `adtech/contextual-targeting-page-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contextual Targeting & Page Classification · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Contextual Targeting & Page Classification": Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on clean article pages only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Page text embedding | text encoder embedding | Topic | Cleaning |   |   |   |
| Entity and keyword extraction | NER and keyphrases | Targeting keys | Quality |   |   |   |
| Title and URL tokens | URL path tokens | Cheap early signal | Regex |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Freshness | Fast pre-classification on crawl with caching | Classify on every ad request | Per-request classification is too slow and costly |
| Granularity | Page-level and entity-level topics | Domain-level labels | Domains host diverse content |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Navigation boilerplate | repeated across pages |
| Comment sections | off-topic and risky |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Page text embedding inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: cleaning. |
| Entity and keyword extraction inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: quality. |
| Title and URL tokens inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: regex. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: contextual_targeting_page_classification_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: page_text_embedding, type: double, nullable: false }
    - { name: entity_and_keyword_extraction, type: double, nullable: false }
    - { name: title_and_url_tokens, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Page text embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Entity and keyword extraction against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Page text embedding, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FinancialPhraseBank | https://huggingface.co/datasets/takala/financial_phrasebank | CC BY-NC-SA 3.0 (see the page) | About 4,800 financial news sentences labelled positive, neutral or negative | Small and sentence-level; limited to financial news. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE contextual_targeting_page_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  page_text_embedding                DOUBLE PRECISION,
  entity_and_keyword_extraction      DOUBLE PRECISION,
  title_and_url_tokens               DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE contextual_targeting_page_decisions (
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
CREATE TABLE contextual_targeting_page_labels (
  decision_id    UUID        NOT NULL REFERENCES contextual_targeting_page_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Contextual Targeting & Page Classification": Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Creative, brand safety and ad quality | The ad itself (image, video, copy) affects performance, and unsafe or non-compliant placements harm brands. Generative tools produce variants, and moderation checks copy against policy and context. | Optimising click rate alone rewards clickbait; guardrails for quality, compliance and brand suitability are part of the objective. |
| Position, placement and context | The same ad gets very different click rates depending on where it appears (top of the feed versus a sidebar), on the device and on the time of day. Users also look at higher positions more, so observed click rates mix the quality of an ad with how visible it was. | Logs ranked by an old model teach a new model the old ranking unless position is handled explicitly. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Page text embedding | Text encoder embedding. Topic. | Leakage risk to design against: Cleaning. |
| A signal-versus-noise trap in this use case: Freshness | The true signal is fast pre-classification on crawl with caching; the common noise is classify on every ad request. | Per-request classification is too slow and costly. |

**Ask the experts**

- [ ] What exactly does "Classification latency under 50 ms with caching" mean in practice for contextual targeting & page classification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Page text embedding" and "Entity and keyword extraction", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Contextual campaign CPA vs behavioural" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on clean article pages only, and who can confirm the cut-off times and splits?
- [ ] How often does "Breaking news page not yet crawled" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Contextual targeting | Choosing ads by the page or content being viewed rather than by the user. |
| Brand safety | Keeping ads away from content that could harm the advertiser's reputation. |
| Brand lift | The change in awareness, favourability or purchase intent caused by a campaign, measured by surveys. |
| Clean room | A secure environment where two parties combine data for analysis without exposing individual records. |
| Multi-touch attribution (MTA) | Assigning conversion credit across all the ad exposures along a customer's path. |
| Adstock | The lagged, decaying effect of advertising that continues after the ad is seen. |
| Attention metrics | Measures of how long and how much people look at an ad. |
| Landing page | The page a user reaches after clicking an ad, whose quality affects conversion and cost. |
| Quality score | A platform's estimate of an ad's relevance and landing-page quality that affects its price and rank. |
| Delayed conversion | A purchase or install that happens hours or days after the click, so recent labels are incomplete. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
