# Dynamic Rent Pricing for Multifamily: data and feature specification

> Generated from the blueprint `real-estate/dynamic-rent-pricing-for-multifamily` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Rent Pricing for Multifamily · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Dynamic Rent Pricing for Multifamily": Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A simulated demand curve is optimistic about how tenants react to price.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Inquiry velocity | enquiries per day for the unit type over 7 days divided by the 28-day mean | Shows rising or falling demand before leases signed | Noise from marketing campaigns, so adjust for ad spend |   |   |   |
| Occupancy vs target | current occupancy minus the target occupancy for the date | Tells the policy how hard to push price | Occupancy definitions differ between systems, so use one definition |   |   |   |
| Competitor asking rents | median public asking rent of comparable units within 1 km | Sets the position in the market | Asking prices differ from signed rents, so apply a historical discount |   |   |   |
| Expiry schedule | number of leases expiring per month over the next 12 months | Shapes future vacancy risk | Early terminations alter the schedule, so refresh it daily |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Demand | Lease-up pace and enquiry volume by unit type | The asking rent alone | Price is only one lever, and a quiet week may be from marketing and not from price |
| Competition | Rents published on public listings | Competitor data shared privately between operators | Shared private data raises antitrust issues, and the model can be accused of collusion |
| Horizon | Lease expiries spread evenly across the year | Optimising today's rent only | If many leases expire in one month, the building faces a vacancy spike that today's price hides |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Unit nickname | A label with no bearing on demand |
| Photo count | Depends on the leasing team's habits and not on the unit |
| Agent | The leasing agent does not change what the market will pay |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Inquiry velocity inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: noise from marketing campaigns, so adjust for ad spend. |
| Occupancy vs target inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: occupancy definitions differ between systems, so use one definition. |
| Competitor asking rents inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: asking prices differ from signed rents, so apply a historical discount. |
| Expiry schedule inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: early terminations alter the schedule, so refresh it daily. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: dynamic_rent_pricing_for_multifamily_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: inquiry_velocity, type: double, nullable: false }
    - { name: occupancy_vs_target, type: double, nullable: false }
    - { name: competitor_asking_rents, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Inquiry velocity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Occupancy vs target against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Inquiry velocity, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM AMLSim (anti-money-laundering simulator) | https://github.com/IBM/AMLSim | Apache 2.0 (see the repository) | A simulator that generates transaction networks with injected laundering patterns | Synthetic; patterns reflect the simulator's assumptions. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE dynamic_rent_pricing_for_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE dynamic_rent_pricing_for_outputs (
  run_id TEXT NOT NULL REFERENCES dynamic_rent_pricing_for_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE dynamic_rent_pricing_for_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE dynamic_rent_pricing_for_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Dynamic Rent Pricing for Multifamily": Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Inquiry velocity | Enquiries per day for the unit type over 7 days divided by the 28-day mean. Shows rising or falling demand before leases signed. | Leakage risk to design against: Noise from marketing campaigns, so adjust for ad spend. |
| A signal-versus-noise trap in this use case: Demand | The true signal is lease-up pace and enquiry volume by unit type; the common noise is the asking rent alone. | Price is only one lever, and a quiet week may be from marketing and not from price. |

**Ask the experts**

- [ ] What exactly does "Rent-control and regulatory limits are hard constraints" mean in practice for dynamic rent pricing for multifamily: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Inquiry velocity" and "Occupancy vs target", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Revenue per available unit" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: a simulated demand curve is optimistic about how tenants react to price, and who can confirm the cut-off times and splits?
- [ ] How often does "Rent control" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Effective rent | Rent net of incentives such as free months, spread across the lease term. |
| Occupancy | The share of units or floor area that is leased or in use. |
| Vacancy | Space that is available and unleased, and the share it represents of total space. |
| Days on market | The number of days a listing takes to go under contract. |
| RevPAR | Revenue per available room or unit: revenue divided by available room-nights. |
| Absorption | The rate at which available space or new units are leased or sold over time. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Policy | The rule that maps a situation to an action. |
| Discount factor | How much a future reward is worth compared with the same reward now. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
