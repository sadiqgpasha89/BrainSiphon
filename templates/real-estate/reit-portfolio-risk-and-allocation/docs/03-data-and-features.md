# REIT Portfolio Risk & Allocation: data and feature specification

> Generated from the blueprint `real-estate/reit-portfolio-risk-and-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** REIT Portfolio Risk & Allocation · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "REIT Portfolio Risk & Allocation": Estimate portfolio risk across properties and sectors and recommend allocation changes within mandate limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Back-tests that use smoothed returns show low risk that does not exist.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| De-smoothed volatility | standard deviation of returns after an autoregressive correction for appraisal smoothing | A truer measure of risk than reported volatility | Depends on the smoothing model, so test its sensitivity |   |   |   |
| Sector correlation | rolling correlation of de-smoothed returns between sectors | Shows real diversification | Short histories make correlations unstable, so use shrinkage |   |   |   |
| Lease expiry concentration | share of income expiring in any one year across the portfolio | Cash flow risk that valuations do not show | Break options change the dates, so include them |   |   |   |
| Leverage | loan-to-value ratio at asset and portfolio level using current valuations | Higher leverage magnifies losses and covenant risk | Definitions differ between lenders, so use one convention |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Appraisal | Returns de-smoothed to remove the lag of valuation | Reported appraisal returns used as they are | Appraisals lag the market and understate volatility, so risk looks smaller than it is |
| Concentration | Exposure by sector, region and tenant with correlations | Risk measured one asset at a time | Correlated assets fall together, and a portfolio of safe-looking assets can be a concentrated bet |
| Liquidity | The time needed to sell each asset in a stress | Assuming every asset can be sold at book value | Property is illiquid, so a rebalance that looks cheap on paper may take a year |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Asset name | A label that has no bearing on risk |
| Manager | The asset manager's name is not a risk factor once asset data are known |
| Photo | Appearance of a building says nothing about its risk contribution |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| De-smoothed volatility inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: depends on the smoothing model, so test its sensitivity. |
| Sector correlation inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: short histories make correlations unstable, so use shrinkage. |
| Lease expiry concentration inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: break options change the dates, so include them. |
| Leverage inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: definitions differ between lenders, so use one convention. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: reit_portfolio_risk_and_allocation_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: de_smoothed_volatility, type: double, nullable: false }
    - { name: sector_correlation, type: double, nullable: false }
    - { name: lease_expiry_concentration, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on De-smoothed volatility and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Sector correlation against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as De-smoothed volatility, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jane Street Market Prediction | https://www.kaggle.com/c/jane-street-market-prediction | Competition rules; free Kaggle login | Anonymised market features with returns and a trade-or-not decision target | Anonymised and from one firm; check the data terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE reit_portfolio_risk_and_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE reit_portfolio_risk_and_outputs (
  run_id TEXT NOT NULL REFERENCES reit_portfolio_risk_and_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE reit_portfolio_risk_and_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE reit_portfolio_risk_and_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "REIT Portfolio Risk & Allocation": Estimate portfolio risk across properties and sectors and recommend allocation changes within mandate limits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: De-smoothed volatility | Standard deviation of returns after an autoregressive correction for appraisal smoothing. A truer measure of risk than reported volatility. | Leakage risk to design against: Depends on the smoothing model, so test its sensitivity. |
| A signal-versus-noise trap in this use case: Appraisal | The true signal is returns de-smoothed to remove the lag of valuation; the common noise is reported appraisal returns used as they are. | Appraisals lag the market and understate volatility, so risk looks smaller than it is. |

**Ask the experts**

- [ ] What exactly does "Allocation changes stay within sector, region, leverage and single-asset limits in the mandate" mean in practice for reit portfolio risk & allocation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "De-smoothed volatility" and "Sector correlation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Risk-adjusted return" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: back-tests that use smoothed returns show low risk that does not exist, and who can confirm the cut-off times and splits?
- [ ] How often does "Valuation lag" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| WALT | Weighted average lease term: the average remaining lease length weighted by rent. |
| LTV | Loan-to-value ratio: loan amount divided by property value. |
| Break option | A lease clause that lets the tenant or landlord end the lease early on notice. |
| AVM | Automated valuation model: software that estimates a property's market value from data instead of an on-site appraisal. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Days on market | The number of days a listing takes to go under contract. |
| Floodplain | Land that is likely to flood in a given event, such as a one-in-a-hundred-year flood. |
| Comparable (comp) | A recent sale of a similar nearby property used to estimate the value of the subject property. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
