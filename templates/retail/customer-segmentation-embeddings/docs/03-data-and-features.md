# Behavioural Customer Segmentation with Embeddings: data and feature specification

> Generated from the blueprint `retail/customer-segmentation-embeddings` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Behavioural Customer Segmentation with Embeddings · **Domain:** retail · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Behavioural Customer Segmentation with Embeddings": Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating clusters only on internal metrics.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Sequence embedding of purchases | transformer over order sequences | Behavioural similarity | Fixed observation window |   |   |   |
| Price-tier mix | share of basket by price tier | Value orientation | Normalise by category |   |   |   |
| Channel and device mix | online, store, app proportions | Engagement mode | Consent-aware |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Actionability | Segments validated by differential response to actions | Segments by silhouette score | Pretty clusters may not predict any behaviour difference |
| Stability | Soft assignments with persistence constraints | Re-clustering from scratch monthly | Labels reshuffle and break campaigns |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw demographic fields | sparse and risky for fairness |
| Account creation month | cohort artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Sequence embedding of purchases inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: fixed observation window. |
| Price-tier mix inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: normalise by category. |
| Channel and device mix inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: consent-aware. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: customer_segmentation_embeddings_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: sequence_embedding_of_purchases, type: double, nullable: false }
    - { name: price_tier_mix, type: double, nullable: false }
    - { name: channel_and_device_mix, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Sequence embedding of purchases and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Price-tier mix against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Sequence embedding of purchases, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE customer_segmentation_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE customer_segmentation_outputs (
  run_id TEXT NOT NULL REFERENCES customer_segmentation_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE customer_segmentation_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE customer_segmentation_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Behavioural Customer Segmentation with Embeddings": Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Customers, lifetime value and churn | Retailers segment customers by recency, frequency and monetary value, estimate lifetime value, and try to predict who will lapse or repurchase. Marketing spend should go where it changes behaviour (uplift), not where customers would buy anyway. | Offers cost margin; a model that targets likely buyers rather than persuadable ones wastes discounts. |
| Sessions, anonymity and privacy | A session is a sequence of actions by one visitor, usually split by 30 minutes of inactivity. Many visitors are anonymous or have declined tracking, so the system may only use what happened in this visit and aggregated behaviour of others, not a stored profile. | The model must work from a few clicks, and the way sessions are cut decides what a sequence even is. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Exploration, cold start and diversity | New items and users have no history and are never shown without deliberate exploration; recommenders also need diversity and fairness constraints so long-tail items and sellers get exposure. Bandit methods manage the explore-exploit trade-off. | Coverage and new-item exposure are product metrics, not afterthoughts. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Sequence embedding of purchases | Transformer over order sequences. Behavioural similarity. | Leakage risk to design against: Fixed observation window. |
| A signal-versus-noise trap in this use case: Actionability | The true signal is segments validated by differential response to actions; the common noise is segments by silhouette score. | Pretty clusters may not predict any behaviour difference. |

**Ask the experts**

- [ ] What exactly does "Stable segments month to month" mean in practice for behavioural customer segmentation with embeddings: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Sequence embedding of purchases" and "Price-tier mix", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Campaign lift by segment" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating clusters only on internal metrics, and who can confirm the cut-off times and splits?
- [ ] How often does "Segment drift after new product launch" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| RFM | Recency, frequency and monetary value: three measures used to segment customers. |
| Embedding / ANN | A learned vector for an item or session, and approximate nearest-neighbour search to find similar vectors quickly. |
| Customer lifetime value (CLV) | The total value a customer is expected to bring over their relationship with the retailer. |
| Complementary item | A product bought together with another, such as a case with a phone. |
| Click-and-collect | Ordering online and picking up in store. |
| Loyalty programme | A scheme that rewards repeat purchases with points or offers. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Sequence model (SASRec) | A transformer that predicts the next item from a user's recent history. |
| Matrix factorisation | Learning user and item vectors whose dot product predicts the rating or interaction. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| Distribution shift | A change in the data a model sees compared with training. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
