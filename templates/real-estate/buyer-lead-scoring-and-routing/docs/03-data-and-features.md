# Buyer Lead Scoring & Routing: data and feature specification

> Generated from the blueprint `real-estate/buyer-lead-scoring-and-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Buyer Lead Scoring & Routing · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Buyer Lead Scoring & Routing": Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes are observed only for leads that were contacted, so the model cannot learn from the rest.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Viewing depth | number of distinct listings viewed and the share viewed more than once in 7 days | Repeat viewing of similar homes signals real intent | Bots inflate views, so filter them before computing |   |   |   |
| Finance readiness | pre-approval flag and stated budget relative to the viewed prices | A pre-approved buyer is far more likely to transact | Self-reported readiness is unreliable, so prefer a verified flag |   |   |   |
| Agent response time | median minutes from enquiry to first contact over the last 30 days | Predicts whether a lead gets a fast reply | Agents can game it by sending empty acknowledgements |   |   |   |
| Area expertise | the agent's closed sales in the lead's search area over 24 months | Matches buyer need to agent experience | Sparse for new agents, so shrink towards the team average |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Intent | Behavioural intent such as repeated viewings of similar homes and a saved search | Form fields the buyer chose to fill in | Forms are optional, and the people who fill them are not the ones most likely to buy |
| Match | Agent fit by area expertise, price band and language | Round-robin assignment | A better-matched agent converts more leads, and round robin ignores that difference entirely |
| Timing | Speed of first response measured in minutes | Lead quality alone | The first agent to respond wins many deals, so a good lead routed slowly is lost |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Name | Irrelevant to intent and a direct route to bias |
| Email domain | Mostly a proxy for employer or income and not for intent to buy |
| Device | A proxy for income and age that adds no information about readiness |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Viewing depth inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: bots inflate views, so filter them before computing. |
| Finance readiness inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: self-reported readiness is unreliable, so prefer a verified flag. |
| Agent response time inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: agents can game it by sending empty acknowledgements. |
| Area expertise inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: sparse for new agents, so shrink towards the team average. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: buyer_lead_scoring_and_routing_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: viewing_depth, type: double, nullable: false }
    - { name: finance_readiness, type: double, nullable: false }
    - { name: agent_response_time, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Viewing depth and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Finance readiness against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Viewing depth, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Ames Housing (De Cock) | https://jse.amstat.org/v19n3/decock.pdf | Published for teaching use; see the paper | 2,930 home sales from Ames, Iowa with 80 attributes, written up in a paper that explains every field and the data-cleaning steps | One mid-sized US city over five years: no photos, no micro-market detail and a single price regime. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE buyer_lead_scoring_and_routing_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  viewing_depth                      DOUBLE PRECISION,
  finance_readiness                  DOUBLE PRECISION,
  agent_response_time                DOUBLE PRECISION,
  area_expertise                     DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE buyer_lead_scoring_and_routing_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE buyer_lead_scoring_and_routing_labels (
  decision_id    UUID        NOT NULL REFERENCES buyer_lead_scoring_and_routing_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Buyer Lead Scoring & Routing": Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Listing, search and the buyer funnel | A buyer discovers listings on portals, saves and shares them, enquires, views, makes an offer and goes through a mortgage and a closing. Agents hold the listing relationship, and the portal sees search and engagement behaviour but rarely the final sale. | Engagement is a proxy; the outcome you care about (a sale, a lease) is rare, delayed and often outside the portal's data. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Viewing depth | Number of distinct listings viewed and the share viewed more than once in 7 days. Repeat viewing of similar homes signals real intent. | Leakage risk to design against: Bots inflate views, so filter them before computing. |
| A signal-versus-noise trap in this use case: Intent | The true signal is behavioural intent such as repeated viewings of similar homes and a saved search; the common noise is form fields the buyer chose to fill in. | Forms are optional, and the people who fill them are not the ones most likely to buy. |

**Ask the experts**

- [ ] What exactly does "Scoring and routing finish within 80 ms of the enquiry" mean in practice for buyer lead scoring & routing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Viewing depth" and "Finance readiness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Lead-to-viewing rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: outcomes are observed only for leads that were contacted, so the model cannot learn from the rest, and who can confirm the cut-off times and splits?
- [ ] How often does "Bot enquiries" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Redlining | Denying or worsening services in certain areas based on the demographics of the area. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| p99 latency | The time within which 99% of requests complete. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
