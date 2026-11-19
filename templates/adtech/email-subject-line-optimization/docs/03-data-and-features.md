# Email Subject Line & Send Optimisation: data and feature specification

> Generated from the blueprint `adtech/email-subject-line-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Email Subject Line & Send Optimisation · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Email Subject Line & Send Optimisation": Choose subject lines that lift real engagement and conversions rather than opens inflated by privacy features. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on opens.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Subject embedding features | semantic embedding of subject | Content | Encoder |   |   |   |
| Audience segment affinity | segment response to themes | Personalisation | History |   |   |   |
| Send-time context | local time and weekday | Context | Time zone |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Metric | Clicks and conversions as reward | Open rate | Mail privacy features auto-open messages |
| Generation | Generate variants and select via bandit | Pick by predicted opens | Predicted opens learned from distorted data |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Emoji count alone | spurious |
| Subject length | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Subject embedding features inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: encoder. |
| Audience segment affinity inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: history. |
| Send-time context inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: time zone. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: email_subject_line_optimization_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: subject_embedding_features, type: double, nullable: false }
    - { name: audience_segment_affinity, type: double, nullable: false }
    - { name: send_time_context, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Subject embedding features and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Audience segment affinity against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Subject embedding features, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE email_subject_line_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  subject_embedding_features         DOUBLE PRECISION,
  audience_segment_affinity          DOUBLE PRECISION,
  send_time_context                  DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE email_subject_line_decisions (
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
CREATE TABLE email_subject_line_labels (
  decision_id    UUID        NOT NULL REFERENCES email_subject_line_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Email Subject Line & Send Optimisation": Choose subject lines that lift real engagement and conversions rather than opens inflated by privacy features. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Audiences, identity and privacy | Targeting uses audience segments, lookalikes built from seed customers, and identity graphs that link devices and cookies. Consent laws, platform rules and cookie deprecation push the industry to context, first-party data, clean rooms and aggregated or privacy-preserving measurement. | Features and joins that were routine are becoming unavailable; designs must tolerate missing identifiers and prove privacy properties. |
| Creative, brand safety and ad quality | The ad itself (image, video, copy) affects performance, and unsafe or non-compliant placements harm brands. Generative tools produce variants, and moderation checks copy against policy and context. | Optimising click rate alone rewards clickbait; guardrails for quality, compliance and brand suitability are part of the objective. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Subject embedding features | Semantic embedding of subject. Content. | Leakage risk to design against: Encoder. |
| A signal-versus-noise trap in this use case: Metric | The true signal is clicks and conversions as reward; the common noise is open rate. | Mail privacy features auto-open messages. |

**Ask the experts**

- [ ] What exactly does "Brand and compliance" mean in practice for email subject line & send optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Subject embedding features" and "Audience segment affinity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Click-through and conversion rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on opens, and who can confirm the cut-off times and splits?
- [ ] How often does "Auto-opens inflate engagement for one segment" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Retargeting | Showing ads to people who have already visited a site or product. |
| Clean room | A secure environment where two parties combine data for analysis without exposing individual records. |
| Differential privacy | A mathematical guarantee that adding noise limits what any output reveals about one person. |
| Brand lift | The change in awareness, favourability or purchase intent caused by a campaign, measured by surveys. |
| Brand safety | Keeping ads away from content that could harm the advertiser's reputation. |
| CTV | Connected TV: streaming video on internet-connected television sets. |
| SKAN / ATT | Apple's privacy frameworks for app tracking and install attribution that limit user-level data. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Policy | The rule that maps a situation to an action. |
| Reward | The number the system tries to maximise over time. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
