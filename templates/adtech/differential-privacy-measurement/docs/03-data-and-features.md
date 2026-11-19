# Differentially Private Ad Measurement: data and feature specification

> Generated from the blueprint `adtech/differential-privacy-measurement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Differentially Private Ad Measurement · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Differentially Private Ad Measurement": Provide campaign reach and conversion reporting with formal differential-privacy guarantees and useful accuracy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating utility without privacy composition.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Sensitivity bound | per-user contribution cap | Noise scale | Clipping |   |   |   |
| Epsilon allocation | budget by metric and level | Utility | Policy |   |   |   |
| Post-processing consistency | non-negativity and hierarchy constraints | Quality | Consistency |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Budget | Privacy budget accounting across queries | One-off noise per report | Repeated queries leak through averaging |
| Utility | Hierarchical noise with post-processing | Naive Laplace on each cell | Small cells become pure noise |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw per-user rows | not released |
| Exact small counts | privacy risk |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Sensitivity bound inputs | Ad platform engineering | Campaign and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: clipping. |
| Epsilon allocation inputs | Measurement science | Billing and invoicing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: policy. |
| Post-processing consistency inputs | Privacy engineering | Identity graph and consent store (CMP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: consistency. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: differential_privacy_measurement_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: sensitivity_bound, type: double, nullable: false }
    - { name: epsilon_allocation, type: double, nullable: false }
    - { name: post_processing_consistency, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Sensitivity bound and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Epsilon allocation against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Sensitivity bound, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE differential_privacy_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE differential_privacy_outputs (
  run_id TEXT NOT NULL REFERENCES differential_privacy_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE differential_privacy_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE differential_privacy_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Differentially Private Ad Measurement": Provide campaign reach and conversion reporting with formal differential-privacy guarantees and useful accuracy. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Audiences, identity and privacy | Targeting uses audience segments, lookalikes built from seed customers, and identity graphs that link devices and cookies. Consent laws, platform rules and cookie deprecation push the industry to context, first-party data, clean rooms and aggregated or privacy-preserving measurement. | Features and joins that were routine are becoming unavailable; designs must tolerate missing identifiers and prove privacy properties. |
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Privacy and signal loss | Consent rules (GDPR, CCPA), platform changes such as app tracking limits and the phase-out of third-party cookies remove cross-site identifiers. Models rely more on context, first-party signals and aggregated data. | Features you can use today may be unavailable next year; design for graceful loss of signals. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Sensitivity bound | Per-user contribution cap. Noise scale. | Leakage risk to design against: Clipping. |
| A signal-versus-noise trap in this use case: Budget | The true signal is privacy budget accounting across queries; the common noise is one-off noise per report. | Repeated queries leak through averaging. |

**Ask the experts**

- [ ] What exactly does "Epsilon budget accounting" mean in practice for differentially private ad measurement: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Sensitivity bound" and "Epsilon allocation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Usable metrics coverage" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating utility without privacy composition, and who can confirm the cut-off times and splits?
- [ ] How often does "Analysts re-query with tiny variations" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Differential privacy | A mathematical guarantee that adding noise limits what any output reveals about one person. |
| Clean room | A secure environment where two parties combine data for analysis without exposing individual records. |
| SKAN / ATT | Apple's privacy frameworks for app tracking and install attribution that limit user-level data. |
| ROAS | Return on ad spend: revenue generated per currency unit of advertising. |
| Media mix model (MMM) | A statistical model of sales as a function of channel spend, seasonality and controls. |
| Saturation curve | The diminishing return from additional spend in a channel. |
| Geo experiment | A test that varies advertising across regions to measure lift without user-level tracking. |
| CTV | Connected TV: streaming video on internet-connected television sets. |
| Out-of-home (OOH) | Advertising in physical places such as billboards and transit, measured with location data. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
