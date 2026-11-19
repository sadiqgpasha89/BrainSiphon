# Commercial Occupancy & Rent-Roll Forecasting: data and feature specification

> Generated from the blueprint `real-estate/commercial-occupancy-and-rent-roll-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Occupancy & Rent-Roll Forecasting · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Commercial Occupancy & Rent-Roll Forecasting": Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A back-test through a strong market makes any renewal assumption look good.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Expiry profile | share of income expiring within 12 months and within 36 months | The main driver of near-term income risk | Break options can move the real expiry earlier, so include them |   |   |   |
| Renewal propensity | predicted probability that the tenant renews, from tenant sector, size and history | Gives the expected income retained | Few renewal events per tenant, so pool by tenant type |   |   |   |
| Submarket vacancy | vacancy rate of comparable space within the submarket over the last 8 quarters | Shows the strength of demand for re-letting | Sources define vacancy differently, so use one source throughout |   |   |   |
| Rent gap to market | passing rent minus market rent as a share of market rent | A tenant above market is likely to leave or reduce rent | Market rent estimates are uncertain, so carry an interval |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Expiry | Lease expiries and break options as dated events | A smooth occupancy trend | Occupancy moves in steps at expiries, and a trend line smooths over the cliff |
| Renewal | Tenant-level renewal probability based on that tenant | A portfolio average renewal rate | An anchor tenant and a small tenant behave very differently, so an average is wrong for both |
| Market | Submarket vacancy and rents for the specific area | National or city-wide data | Local markets diverge, and the relevant vacancy is the one next door |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Property name | A label that carries no income information |
| Manager | The identity of the property manager does not change lease terms |
| Photo | Images of the building say nothing about lease expiries or tenants |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Expiry profile inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: break options can move the real expiry earlier, so include them. |
| Renewal propensity inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: few renewal events per tenant, so pool by tenant type. |
| Submarket vacancy inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: sources define vacancy differently, so use one source throughout. |
| Rent gap to market inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: market rent estimates are uncertain, so carry an interval. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: commercial_occupancy_and_rent_roll_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: expiry_profile, type: double, nullable: false }
    - { name: renewal_propensity, type: double, nullable: false }
    - { name: submarket_vacancy, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Expiry profile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Renewal propensity against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Expiry profile, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE commercial_occupancy_and_rent_forecasts (
  series_id      TEXT        NOT NULL,
  origin         TIMESTAMPTZ NOT NULL,   -- the as_of the forecast was made at
  target_period  DATE        NOT NULL,
  horizon_step   SMALLINT    NOT NULL,
  p10            REAL        NOT NULL,
  p50            REAL        NOT NULL,
  p90            REAL        NOT NULL,
  model_version  TEXT        NOT NULL,
  is_fallback    BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (series_id, origin, target_period)
) PARTITION BY RANGE (origin);

-- actuals land after the fact; joining on (series_id, target_period) gives forecast error by horizon
CREATE TABLE commercial_occupancy_and_rent_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE commercial_occupancy_and_rent_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Commercial Occupancy & Rent-Roll Forecasting": Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Expiry profile | Share of income expiring within 12 months and within 36 months. The main driver of near-term income risk. | Leakage risk to design against: Break options can move the real expiry earlier, so include them. |
| A signal-versus-noise trap in this use case: Expiry | The true signal is lease expiries and break options as dated events; the common noise is a smooth occupancy trend. | Occupancy moves in steps at expiries, and a trend line smooths over the cliff. |

**Ask the experts**

- [ ] What exactly does "The forecast is built lease by lease and reconciles to the current rent roll" mean in practice for commercial occupancy & rent-roll forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Expiry profile" and "Renewal propensity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Forecast accuracy" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: a back-test through a strong market makes any renewal assumption look good, and who can confirm the cut-off times and splits?
- [ ] How often does "Anchor tenant leaves" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Occupancy | The share of units or floor area that is leased or in use. |
| Vacancy | Space that is available and unleased, and the share it represents of total space. |
| WALT | Weighted average lease term: the average remaining lease length weighted by rent. |
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| Effective rent | Rent net of incentives such as free months, spread across the lease term. |
| Break option | A lease clause that lets the tenant or landlord end the lease early on notice. |
| Absorption | The rate at which available space or new units are leased or sold over time. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| RevPAR | Revenue per available room or unit: revenue divided by available room-nights. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
