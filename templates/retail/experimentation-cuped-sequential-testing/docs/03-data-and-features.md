# Experimentation: CUPED & Sequential Testing: data and feature specification

> Generated from the blueprint `retail/experimentation-cuped-sequential-testing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Experimentation: CUPED & Sequential Testing · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Experimentation: CUPED & Sequential Testing": Speed up online experiments with variance reduction and valid always-on sequential testing so teams ship decisions faster without false positives. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using post-treatment covariates.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pre-period metric covariate | user metric in 28 days before assignment | CUPED covariate | Strictly pre-assignment |   |   |   |
| Sample-ratio mismatch statistic | chi-square on arm sizes | Data quality | Per-experiment automatic check |   |   |   |
| Novelty decay curve | effect by exposure day | Effect durability | Cohort exposure start |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Variance | Pre-experiment covariates for variance reduction | Running longer | Longer tests delay decisions and still have noisy tails |
| Peeking | Always-valid p-values (mSPRT) | Repeated t-tests while peeking | Peeking inflates false positives to 30% |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Post-exposure covariates | bias the effect |
| Unplanned subgroup analyses | false discoveries |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pre-period metric covariate inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: strictly pre-assignment. |
| Sample-ratio mismatch statistic inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: per-experiment automatic check. |
| Novelty decay curve inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: cohort exposure start. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: experimentation_cuped_sequential_testing_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pre_period_metric_covariate, type: double, nullable: false }
    - { name: sample_ratio_mismatch_statistic, type: double, nullable: false }
    - { name: novelty_decay_curve, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Pre-period metric covariate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Sample-ratio mismatch statistic against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pre-period metric covariate, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Instacart Market Basket Analysis | https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis | Competition rules; free Kaggle login | 3 million grocery orders from 200K users with reorder labels | No timestamps beyond day-of-week and hour; US grocery only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE experimentation_cuped_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE experimentation_cuped_outputs (
  run_id TEXT NOT NULL REFERENCES experimentation_cuped_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE experimentation_cuped_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE experimentation_cuped_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Experimentation: CUPED & Sequential Testing": Speed up online experiments with variance reduction and valid always-on sequential testing so teams ship decisions faster without false positives. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Search, browse and ranking in a marketplace | Shoppers arrive through search queries, category pages and recommendation strips. Each is a ranking problem with different signals: a query has explicit intent, a category page has none, and a marketplace must also be fair to sellers and obey sponsored-placement rules. Position bias means top slots get clicks regardless of quality. | Offline relevance judgments, click logs and revenue metrics disagree; ranking systems are judged by interleaving and online tests, with exposure and fairness constraints. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Pre-period metric covariate | User metric in 28 days before assignment. CUPED covariate. | Leakage risk to design against: Strictly pre-assignment. |
| A signal-versus-noise trap in this use case: Variance | The true signal is pre-experiment covariates for variance reduction; the common noise is running longer. | Longer tests delay decisions and still have noisy tails. |

**Ask the experts**

- [ ] What exactly does "Type-I error control" mean in practice for experimentation: cuped & sequential testing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pre-period metric covariate" and "Sample-ratio mismatch statistic", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to decision" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using post-treatment covariates, and who can confirm the cut-off times and splits?
- [ ] How often does "Interference between treatment and control (marketplace)" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Buy box | The featured offer on a product page that most purchases go through, which sellers compete for. |
| Cold start | A new item or visitor with no history to learn from. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| SKU | Stock-keeping unit: one distinct product variant such as a size and colour. |
| Markdown | A permanent price reduction applied to clear aging or excess stock. |
| Replenishment | Ordering or moving stock to restore inventory to target levels. |
| Stock-out | A period when an item is unavailable, so demand is lost or substituted. |
| Shrinkage | Inventory lost to theft, damage or error between purchase and sale. |
| Substitution | Offering a different item when the ordered one is out of stock. |
| Return rate | The share of purchases that are sent back, high in fashion and a major cost. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Distribution shift | A change in the data a model sees compared with training. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
