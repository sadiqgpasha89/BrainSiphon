# Data Clean-Room Audience Matching & Measurement: data and feature specification

> Generated from the blueprint `adtech/clean-room-audience-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Data Clean-Room Audience Matching & Measurement · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Data Clean-Room Audience Matching & Measurement": Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating match rate without precision.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Match key quality | hashed email normalisation consistency | Match rate | Normalisation |   |   |   |
| Overlap estimate | intersection size with noise | Planning | DP |   |   |   |
| Conversion lift in joined population | measured lift | Value | Controls |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Matching | Hashed or PSI-based matching with fuzzy fallbacks | Plain-text joins | Plaintext sharing violates policy |
| Output | Aggregate outputs with thresholds | Exportable user lists | Lists leak identities |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw emails | not shared |
| Free-text addresses | messy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Match key quality inputs | Ad platform engineering | Campaign and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: normalisation. |
| Overlap estimate inputs | Measurement science | Billing and invoicing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: DP. |
| Conversion lift in joined population inputs | Privacy engineering | Identity graph and consent store (CMP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: controls. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: clean_room_audience_matching_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: match_key_quality, type: double, nullable: false }
    - { name: overlap_estimate, type: double, nullable: false }
    - { name: conversion_lift_in_joined_population, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Match key quality and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Overlap estimate against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Match key quality, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Research release from Los Alamos National Laboratory (see the page) | 58 days of authentication, process, flow and DNS events with a red-team subset | Anonymised and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE clean_room_audience_matching_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE clean_room_audience_matching_outputs (
  run_id TEXT NOT NULL REFERENCES clean_room_audience_matching_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE clean_room_audience_matching_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE clean_room_audience_matching_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Data Clean-Room Audience Matching & Measurement": Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Audiences, identity and privacy | Targeting uses audience segments, lookalikes built from seed customers, and identity graphs that link devices and cookies. Consent laws, platform rules and cookie deprecation push the industry to context, first-party data, clean rooms and aggregated or privacy-preserving measurement. | Features and joins that were routine are becoming unavailable; designs must tolerate missing identifiers and prove privacy properties. |
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Match key quality | Hashed email normalisation consistency. Match rate. | Leakage risk to design against: Normalisation. |
| A signal-versus-noise trap in this use case: Matching | The true signal is hashed or PSI-based matching with fuzzy fallbacks; the common noise is plain-text joins. | Plaintext sharing violates policy. |

**Ask the experts**

- [ ] What exactly does "No row-level data leaves the room" mean in practice for data clean-room audience matching & measurement: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Match key quality" and "Overlap estimate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to insight" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating match rate without precision, and who can confirm the cut-off times and splits?
- [ ] How often does "Match keys normalised differently" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Clean room | A secure environment where two parties combine data for analysis without exposing individual records. |
| CTV | Connected TV: streaming video on internet-connected television sets. |
| Retargeting | Showing ads to people who have already visited a site or product. |
| Differential privacy | A mathematical guarantee that adding noise limits what any output reveals about one person. |
| Lookalike audience | A group of people who resemble an advertiser's existing customers. |
| Seed audience | The known customers used as the starting point for building a lookalike audience. |
| Geo experiment | A test that varies advertising across regions to measure lift without user-level tracking. |
| SKAN / ATT | Apple's privacy frameworks for app tracking and install attribution that limit user-level data. |
| Out-of-home (OOH) | Advertising in physical places such as billboards and transit, measured with location data. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
