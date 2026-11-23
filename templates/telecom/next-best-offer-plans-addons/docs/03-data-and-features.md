# Next-Best-Offer for Plans & Add-ons: data and feature specification

> Generated from the blueprint `telecom/next-best-offer-plans-addons` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Next-Best-Offer for Plans & Add-ons · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Next-Best-Offer for Plans & Add-ons": Recommend the plan, add-on or device offer most likely to benefit the customer and the business in each channel with consent and fair-treatment rules applied. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising take-up only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Usage versus plan fit | share of allowance used and overage events | Plan upgrade or downgrade need | Per cycle |   |   |   |
| Device age and upgrade eligibility | device age and financing status | Device offer fit | From the device record |   |   |   |
| Past offer response | accept and ignore history by offer type | Taste | Decay old events |   |   |   |
| Life event proxies | new address or new line for family | Moments of need | Only with consent |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | Long-term value including retention | Immediate take-up | High take-up of unsuitable add-ons later becomes complaints |
| Eligibility | Rules applied before ranking | Ranking then filtering | Ineligible offers waste exposure |
| Fairness | Suitability checks for vulnerable customers | Maximum conversion | Mis-selling carries regulatory risk |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Time since last login alone | weak link |
| Offer image colour | no link to need |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Usage versus plan fit inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: per cycle. |
| Device age and upgrade eligibility inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the device record. |
| Past offer response inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: decay old events. |
| Life event proxies inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: only with consent. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: next_best_offer_plans_addons_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: usage_versus_plan_fit, type: double, nullable: false }
    - { name: device_age_and_upgrade_eligibility, type: double, nullable: false }
    - { name: past_offer_response, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Usage versus plan fit and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Device age and upgrade eligibility against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Usage versus plan fit, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MovieLens datasets | https://grouplens.org/datasets/movielens/ | GroupLens research terms (see the page) | Explicit ratings from 100K to 25M with timestamps, the standard recommender benchmark | Explicit ratings are not implicit clicks; film domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE next_best_offer_plans_addons_impressions (
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

CREATE TABLE next_best_offer_plans_addons_feedback (
  impression_id  UUID        NOT NULL REFERENCES next_best_offer_plans_addons_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE next_best_offer_plans_addons_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Next-Best-Offer for Plans & Add-ons": Recommend the plan, add-on or device offer most likely to benefit the customer and the business in each channel with consent and fair-treatment rules applied. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Churn has drivers and a cost to prevent | Subscribers leave because of price, network quality, service failures, competitor offers and contract end dates. Retention offers cost margin, so they should go to customers who are both at risk and persuadable. | Predicting only who will leave wastes offers on customers who would have stayed or who cannot be saved. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Subscriber data is regulated | Location, call and browsing records are personal data with retention limits, consent requirements and lawful-access rules. Analytics normally run on pseudonymised, aggregated data with strict access controls. | A use case that needs identified location data needs a legal basis and tight controls before any model is built. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Usage versus plan fit | Share of allowance used and overage events. Plan upgrade or downgrade need. | Leakage risk to design against: Per cycle. |
| A signal-versus-noise trap in this use case: Objective | The true signal is long-term value including retention; the common noise is immediate take-up. | High take-up of unsuitable add-ons later becomes complaints. |

**Ask the experts**

- [ ] What exactly does "Response under 80 ms" mean in practice for next-best-offer for plans & add-ons: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Usage versus plan fit" and "Device age and upgrade eligibility", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Incremental revenue against holdout" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising take-up only, and who can confirm the cut-off times and splits?
- [ ] How often does "New offer" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| ARPU | Average revenue per user: revenue divided by the number of subscribers in a period. |
| TM Forum | The industry body that publishes telecom process and API standards. |
| Cell site | A location with antennas and radio equipment serving a coverage area. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| MRR | Mean reciprocal rank: the average of one over the rank of the first relevant item. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Coverage | The share of the catalogue that is ever recommended. |
| Popularity bias | The tendency to recommend already-popular items. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
