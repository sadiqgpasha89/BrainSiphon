# Commercial Tenant Credit Risk: data and feature specification

> Generated from the blueprint `real-estate/commercial-tenant-credit-risk` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Tenant Credit Risk · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Commercial Tenant Credit Risk": Predict the likelihood that commercial tenants default on rent so landlords price deposits, incentives and exposure. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few defaults make any estimate noisy and hide poor performance on the rare cases.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Payment days trend | change in average days paid after the due date over the last 6 months | An early warning of stress | Agreed concessions look like lateness, so exclude them |   |   |   |
| Rent to revenue | annual rent divided by estimated annual tenant revenue | Shows how heavy the occupancy cost is | Revenue estimates are noisy, so use sector medians when private |   |   |   |
| Sector stress index | composite of insolvencies, footfall and sector sales for the tenant's industry | Gives context for a tenant's behaviour | Different sources give different readings, so use one |   |   |   |
| Guarantor strength | credit rating or equivalent of the parent or guarantor | Support behind the lease reduces loss | Ratings are missing for private guarantors, so mark them unknown |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Rent | Rent as a share of the tenant's revenue | A credit score only | A tenant with a good score and an unaffordable rent still fails, since occupancy cost matters |
| Sector | Sector stress in the tenant's industry and area | A static sector rating | Retail and office cycles diverge, so a single rating hides who is in trouble now |
| Behaviour | Payment behaviour from the rent ledger | Annual financial statements alone | Payment behaviour changes months before the accounts show stress |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Tenant name | A label that carries no credit information and risks bias |
| Lease length | Weakly related once payment behaviour and sector are known |
| Floor | The floor of a unit has no link to the tenant's ability to pay |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Payment days trend inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: agreed concessions look like lateness, so exclude them. |
| Rent to revenue inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: revenue estimates are noisy, so use sector medians when private. |
| Sector stress index inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: different sources give different readings, so use one. |
| Guarantor strength inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: ratings are missing for private guarantors, so mark them unknown. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: commercial_tenant_credit_risk_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: payment_days_trend, type: double, nullable: false }
    - { name: rent_to_revenue, type: double, nullable: false }
    - { name: sector_stress_index, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Payment days trend and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rent to revenue against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Payment days trend, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE commercial_tenant_credit_risk_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE commercial_tenant_credit_risk_fields (
  document_id TEXT NOT NULL REFERENCES commercial_tenant_credit_risk_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE commercial_tenant_credit_risk_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Commercial Tenant Credit Risk": Predict the likelihood that commercial tenants default on rent so landlords price deposits, incentives and exposure. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Payment days trend | Change in average days paid after the due date over the last 6 months. An early warning of stress. | Leakage risk to design against: Agreed concessions look like lateness, so exclude them. |
| A signal-versus-noise trap in this use case: Rent | The true signal is rent as a share of the tenant's revenue; the common noise is a credit score only. | A tenant with a good score and an unaffordable rent still fails, since occupancy cost matters. |

**Ask the experts**

- [ ] What exactly does "Each score shows the factors behind it so an asset manager can explain it" mean in practice for commercial tenant credit risk: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Payment days trend" and "Rent to revenue", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Bad debt" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: few defaults make any estimate noisy and hide poor performance on the rare cases, and who can confirm the cut-off times and splits?
- [ ] How often does "Anchor tenant" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| WALT | Weighted average lease term: the average remaining lease length weighted by rent. |
| Delinquency | A tenant being late on rent beyond the grace period. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Effective rent | Rent net of incentives such as free months, spread across the lease term. |
| Security deposit | Money held against damage or unpaid rent, returned after deductions at move-out. |
| Floodplain | Land that is likely to flood in a given event, such as a one-in-a-hundred-year flood. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
