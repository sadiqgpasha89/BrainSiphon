# Closing Process Delay Prediction: data and feature specification

> Generated from the blueprint `real-estate/closing-process-delay-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Closing Process Delay Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Closing Process Delay Prediction": Predict which home purchases will miss their closing date and why, so agents and lenders chase the right items. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes after action, because coordinators chase risky deals and thereby change the result.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Outstanding conditions | count of lender conditions not yet cleared | The more conditions open, the higher the delay risk | Counts vary by lender, so normalise by loan type |   |   |   |
| Appraisal status | state of the appraisal: not ordered, ordered, received or disputed | Appraisal problems are a main cause of delay | Status updates come late, so use time since the last change |   |   |   |
| Lender responsiveness | median days the lender takes to respond to requests in the last 10 deals | A slow lender predicts a delayed closing | Small samples for smaller lenders |   |   |   |
| Days to close | days between today and the contract closing date | Time left to fix the open items | Extensions change the date, so use the current agreed one |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Cause | The specific cause of a likely delay, such as appraisal or title | A delay probability alone | Actions differ by cause, so a number with no cause does not tell a coordinator what to do |
| Stage | The process stage the transaction is in | Calendar time to closing | Risk depends on stage, and a deal ten days out at the appraisal stage is riskier than one at clear-to-close |
| Action | Actionable items such as a missing document or an unsigned form | A score the coordinator cannot act on | A score without a task list is ignored, and the value is in the chase |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Buyer name | Personal data with no predictive value |
| Property photo | Appearance of the home does not affect the closing process |
| Agent | The agent's name captures habit and not the status of the deal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Outstanding conditions inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: counts vary by lender, so normalise by loan type. |
| Appraisal status inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: status updates come late, so use time since the last change. |
| Lender responsiveness inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: small samples for smaller lenders. |
| Days to close inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: extensions change the date, so use the current agreed one. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: closing_process_delay_prediction_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: outstanding_conditions, type: double, nullable: false }
    - { name: appraisal_status, type: double, nullable: false }
    - { name: lender_responsiveness, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Outstanding conditions and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Appraisal status against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Outstanding conditions, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Ames Housing (De Cock) | https://jse.amstat.org/v19n3/decock.pdf | Published for teaching use; see the paper | 2,930 home sales from Ames, Iowa with 80 attributes, written up in a paper that explains every field and the data-cleaning steps | One mid-sized US city over five years: no photos, no micro-market detail and a single price regime. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE closing_process_delay_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE closing_process_delay_outputs (
  run_id TEXT NOT NULL REFERENCES closing_process_delay_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE closing_process_delay_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE closing_process_delay_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Closing Process Delay Prediction": Predict which home purchases will miss their closing date and why, so agents and lenders chase the right items. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Transactions, title and fraud | Buying property involves a contract, searches of title and liens, mortgage underwriting, an escrow or closing agent, and recording of the deed. Fraud includes forged deeds, owner impersonation and fake rental ads, and delay comes from missing conditions and lender steps. | Title and closing data are fragmented across parties, so labels are sparse and investigators need evidence, not just scores. |
| Listing, search and the buyer funnel | A buyer discovers listings on portals, saves and shares them, enquires, views, makes an offer and goes through a mortgage and a closing. Agents hold the listing relationship, and the portal sees search and engagement behaviour but rarely the final sale. | Engagement is a proxy; the outcome you care about (a sale, a lease) is rare, delayed and often outside the portal's data. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Outstanding conditions | Count of lender conditions not yet cleared. The more conditions open, the higher the delay risk. | Leakage risk to design against: Counts vary by lender, so normalise by loan type. |
| A signal-versus-noise trap in this use case: Cause | The true signal is the specific cause of a likely delay, such as appraisal or title; the common noise is a delay probability alone. | Actions differ by cause, so a number with no cause does not tell a coordinator what to do. |

**Ask the experts**

- [ ] What exactly does "Scores refreshed daily with the latest transaction status" mean in practice for closing process delay prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Outstanding conditions" and "Appraisal status", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "On-time closings" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: outcomes after action, because coordinators chase risky deals and thereby change the result, and who can confirm the cut-off times and splits?
- [ ] How often does "Rate lock expiry" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Escrow | A neutral third party holding money and documents until the conditions of a sale are met. |
| Title | The legal ownership of a property, and the search that checks for liens and defects. |
| Lien | A legal claim on a property as security for a debt. |
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| Earned value | A project-control method that compares work completed with the plan and the cost spent. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| AVM | Automated valuation model: software that estimates a property's market value from data instead of an on-site appraisal. |
| Comparable (comp) | A recent sale of a similar nearby property used to estimate the value of the subject property. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
