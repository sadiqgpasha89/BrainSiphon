# Acquisition Deal Sourcing: data and feature specification

> Generated from the blueprint `real-estate/acquisition-deal-sourcing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Acquisition Deal Sourcing · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Acquisition Deal Sourcing": Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observed sales are biased towards properties that were listed, so off-market sales are missed.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Debt maturity | months until the main loan matures | A maturing loan forces a refinance or a sale | Debt data are incomplete for private loans |   |   |   |
| Hold period | years since the last transfer | Owners often sell at typical points in the cycle | Differs by owner type, so segment |   |   |   |
| Owner entity graph | number of properties and entities linked to the same ultimate owner | Shows portfolio context and likely strategy | Resolution errors merge unrelated owners |   |   |   |
| Lease expiry | months until the main lease ends | A vacancy risk that may prompt a sale | Break options shift the real date |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Sale | The likelihood that an owner sells in the next 12 months | Owner wealth or size | Wealth does not imply sale, and wealthy owners hold for decades |
| Ownership | Ownership entities resolved to the people and groups behind them | Parcel owner names as listed | Shell companies and trusts hide the real owner, so the name does not identify who decides |
| Timing | Debt maturity and lease expiry events | A static property profile | Events trigger sales, and a loan that matures in six months changes the odds |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Owner name | A label that the model can memorise without learning why owners sell |
| Parcel ID | An administrative key with no information on sale intent |
| Broker | Who listed it before is not related to who will sell now |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Debt maturity inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: debt data are incomplete for private loans. |
| Hold period inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: differs by owner type, so segment. |
| Owner entity graph inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: resolution errors merge unrelated owners. |
| Lease expiry inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: break options shift the real date. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: acquisition_deal_sourcing_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: debt_maturity, type: double, nullable: false }
    - { name: hold_period, type: double, nullable: false }
    - { name: owner_entity_graph, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Debt maturity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Hold period against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Debt maturity, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jane Street Market Prediction | https://www.kaggle.com/c/jane-street-market-prediction | Competition rules; free Kaggle login | Anonymised market features with returns and a trade-or-not decision target | Anonymised and from one firm; check the data terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE acquisition_deal_sourcing_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE acquisition_deal_sourcing_outputs (
  run_id TEXT NOT NULL REFERENCES acquisition_deal_sourcing_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE acquisition_deal_sourcing_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE acquisition_deal_sourcing_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Acquisition Deal Sourcing": Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Debt maturity | Months until the main loan matures. A maturing loan forces a refinance or a sale. | Leakage risk to design against: Debt data are incomplete for private loans. |
| A signal-versus-noise trap in this use case: Sale | The true signal is the likelihood that an owner sells in the next 12 months; the common noise is owner wealth or size. | Wealth does not imply sale, and wealthy owners hold for decades. |

**Ask the experts**

- [ ] What exactly does "Data licences for ownership, debt and mobility sources are respected" mean in practice for acquisition deal sourcing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Debt maturity" and "Hold period", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Off-market deals" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: observed sales are biased towards properties that were listed, so off-market sales are missed, and who can confirm the cut-off times and splits?
- [ ] How often does "Shell ownership" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Break option | A lease clause that lets the tenant or landlord end the lease early on notice. |
| Absorption | The rate at which available space or new units are leased or sold over time. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| WALT | Weighted average lease term: the average remaining lease length weighted by rent. |
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Floodplain | Land that is likely to flood in a given event, such as a one-in-a-hundred-year flood. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
