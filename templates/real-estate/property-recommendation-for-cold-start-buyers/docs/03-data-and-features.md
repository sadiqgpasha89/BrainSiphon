# Property Recommendation for Cold-Start Buyers: data and feature specification

> Generated from the blueprint `real-estate/property-recommendation-for-cold-start-buyers` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Property Recommendation for Cold-Start Buyers · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Property Recommendation for Cold-Start Buyers": Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Historical logs are dominated by popular homes so offline scores favour popularity.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Questionnaire answers | budget range, bedrooms and preferred area one-hot encoded | The only direct statement of preference a new buyer provides | Self-report is imprecise, so treat it as a prior and not a rule |   |   |   |
| Early views | embedding of the first three viewed homes averaged with decaying weights | Reveals taste not captured by a questionnaire | Curiosity clicks are noisy, so weight saves above views |   |   |   |
| Item embedding | vector from home attributes, images and text trained on engagement | Allows similarity without any user history | Needs retraining as the market changes |   |   |   |
| Lookalike buyers | similarity of early action sequences to established buyers' early sequences | Borrows information from similar journeys | Sparse in the first sessions, so use it with a small weight |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Cold start | Content features of the home and explicit stated preferences | Collaborative filtering from other buyers | A new buyer has no history, so similarity to other buyers is empty |
| Exploration | A deliberate share of diverse options early on | Showing only the closest matches to the first clicks | Early exploitation locks in a taste inferred from curiosity and never lets the buyer find out what they want |
| Stage | The buyer's journey stage, from browsing to touring | A single fixed profile | Needs change over weeks, and last month's preferences mislead this week |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Device | Mostly a proxy for income and not a preference for a property |
| Referrer | Weakly related to what the buyer wants once their actions are known |
| Time of day | Reflects the buyer's schedule, not their taste |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Questionnaire answers inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: self-report is imprecise, so treat it as a prior and not a rule. |
| Early views inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: curiosity clicks are noisy, so weight saves above views. |
| Item embedding inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: needs retraining as the market changes. |
| Lookalike buyers inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: sparse in the first sessions, so use it with a small weight. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: property_recommendation_for_cold_start_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: questionnaire_answers, type: double, nullable: false }
    - { name: early_views, type: double, nullable: false }
    - { name: item_embedding, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Questionnaire answers and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Early views against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Questionnaire answers, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Retailrocket recommender system dataset | https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset | CC BY-NC-SA 4.0 (see the dataset page) | About 2.7 million view, add-to-cart and purchase events with item properties | Anonymised ids and no dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE property_recommendation_for_impressions (
  impression_id  UUID PRIMARY KEY,
  user_id        TEXT        NOT NULL,
  shown_at       TIMESTAMPTZ NOT NULL,
  surface        TEXT        NOT NULL,
  item_id        TEXT        NOT NULL,
  rank           SMALLINT    NOT NULL,
  score          REAL,
  propensity     REAL        NOT NULL,   -- probability the policy showed this item at this rank
  source         TEXT        NOT NULL,   -- ann | co-visit | trending | business-rule | exploration
  model_version  TEXT        NOT NULL,
  experiment_arm TEXT
) PARTITION BY RANGE (shown_at);

CREATE TABLE property_recommendation_for_feedback (
  impression_id  UUID        NOT NULL REFERENCES property_recommendation_for_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE property_recommendation_for_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Property Recommendation for Cold-Start Buyers": Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| Exploration, cold start and diversity | New items and users have no history and are never shown without deliberate exploration; recommenders also need diversity and fairness constraints so long-tail items and sellers get exposure. Bandit methods manage the explore-exploit trade-off. | Coverage and new-item exposure are product metrics, not afterthoughts. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Questionnaire answers | Budget range, bedrooms and preferred area one-hot encoded. The only direct statement of preference a new buyer provides. | Leakage risk to design against: Self-report is imprecise, so treat it as a prior and not a rule. |
| A signal-versus-noise trap in this use case: Cold start | The true signal is content features of the home and explicit stated preferences; the common noise is collaborative filtering from other buyers. | A new buyer has no history, so similarity to other buyers is empty. |

**Ask the experts**

- [ ] What exactly does "Usable recommendations after three actions or a short questionnaire" mean in practice for property recommendation for cold-start buyers: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Questionnaire answers" and "Early views", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Enquiry rate for new users" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: historical logs are dominated by popular homes so offline scores favour popularity, and who can confirm the cut-off times and splits?
- [ ] How often does "Misleading early clicks" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| Days on market | The number of days a listing takes to go under contract. |
| Floodplain | Land that is likely to flood in a given event, such as a one-in-a-hundred-year flood. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| DSCR | Debt service coverage ratio: net operating income divided by debt payments. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| RevPAR | Revenue per available room or unit: revenue divided by available room-nights. |
| Critical path | The longest chain of dependent tasks, which determines the project's earliest completion date. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| Popularity bias | The tendency to recommend already-popular items. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Coverage | The share of the catalogue that is ever recommended. |
