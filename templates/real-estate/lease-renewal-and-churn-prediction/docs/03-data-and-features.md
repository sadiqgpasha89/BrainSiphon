# Lease Renewal & Tenant Churn Prediction: data and feature specification

> Generated from the blueprint `real-estate/lease-renewal-and-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lease Renewal & Tenant Churn Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Lease Renewal & Tenant Churn Prediction": Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past offers were not random, so renewals reflect the offer chosen and not the tenant.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Renewal rent gap | proposed renewal rent minus the market rent for a similar unit | A tenant paying above market is likely to move | Market rent estimates are noisy, so use a range |   |   |   |
| Maintenance resolution time | median days to close a request in the last 12 months | A slow service experience drives churn | Logging gaps understate delays, so use ticket close dates |   |   |   |
| Tenure | months in the unit, bucketed into cohorts | Longer tenants are more likely to stay | Strongly tied to age and life stage, so check for unfairness |   |   |   |
| Life events | moves in the job address, a change in household size or an inquiry about a purchase | Triggers for leaving that predict churn | Data are partial and consent-based, so use only data the tenant has agreed to share |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Price | The renewal rent compared with the current market rent for the unit | The absolute rent amount | Tenants judge an offer against what else is available, not against their old rent |
| Experience | How the tenant was served, measured by repair times and complaints | The lease terms | Unresolved complaints predict leaving far better than the contract does |
| Cost | The full cost of turnover including cleaning, marketing and lost rent | Vacancy days alone | Turnover costs more than the empty days, so a small discount can be cheaper than a vacancy |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Unit floor | A weak and unstable relation to renewal once price and service are known |
| Name | Irrelevant and a route to bias |
| Lease signing weekday | Reflects the manager's schedule and says nothing about intent |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Renewal rent gap inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: market rent estimates are noisy, so use a range. |
| Maintenance resolution time inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: logging gaps understate delays, so use ticket close dates. |
| Tenure inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: strongly tied to age and life stage, so check for unfairness. |
| Life events inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data are partial and consent-based, so use only data the tenant has agreed to share. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: lease_renewal_and_churn_prediction_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: renewal_rent_gap, type: double, nullable: false }
    - { name: maintenance_resolution_time, type: double, nullable: false }
    - { name: tenure, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Renewal rent gap and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Maintenance resolution time against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Renewal rent gap, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Instacart Market Basket Analysis | https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis | Competition rules; free Kaggle login | 3 million grocery orders from 200K users with reorder labels | No timestamps beyond day-of-week and hour; US grocery only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE lease_renewal_and_churn_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE lease_renewal_and_churn_outputs (
  run_id TEXT NOT NULL REFERENCES lease_renewal_and_churn_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE lease_renewal_and_churn_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE lease_renewal_and_churn_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Lease Renewal & Tenant Churn Prediction": Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Renewal rent gap | Proposed renewal rent minus the market rent for a similar unit. A tenant paying above market is likely to move. | Leakage risk to design against: Market rent estimates are noisy, so use a range. |
| A signal-versus-noise trap in this use case: Price | The true signal is the renewal rent compared with the current market rent for the unit; the common noise is the absolute rent amount. | Tenants judge an offer against what else is available, not against their old rent. |

**Ask the experts**

- [ ] What exactly does "Renewal offers follow every local rent-control and notice rule" mean in practice for lease renewal & tenant churn prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Renewal rent gap" and "Maintenance resolution time", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Renewal rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: past offers were not random, so renewals reflect the offer chosen and not the tenant, and who can confirm the cut-off times and splits?
- [ ] How often does "Rent control" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Days on market | The number of days a listing takes to go under contract. |
| Effective rent | Rent net of incentives such as free months, spread across the lease term. |
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Break option | A lease clause that lets the tenant or landlord end the lease early on notice. |
| Absorption | The rate at which available space or new units are leased or sold over time. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| WALT | Weighted average lease term: the average remaining lease length weighted by rent. |
| Fair housing | Laws prohibiting discrimination in selling, renting, advertising and financing housing. |
| Delinquency | A tenant being late on rent beyond the grace period. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
