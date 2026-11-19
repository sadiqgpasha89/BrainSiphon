# Dynamic Pricing Optimisation: data and feature specification

> Generated from the blueprint `retail/dynamic-pricing-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Pricing Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Dynamic Pricing Optimisation": Set prices per SKU and channel to maximise margin dollars under inventory, competitor and brand-guardrail constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Elasticities estimated from observational price changes.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Own-price elasticity | log-log slope from randomised price cells | Demand response | Randomisation required for validity |   |   |   |
| Competitor price index | own price divided by matched competitor median | Relative position | Matching must be accurate |   |   |   |
| Days of cover | stock divided by forecast demand | Scarcity | Forecast as-of, not realised |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Causality | Causal elasticity from price experiments and instruments | Regressing sales on price | Sellers raise price when demand is high, creating a positive confounded slope |
| Dynamics | Inventory and lifecycle-aware pricing | Per-day myopic optimisation | Myopic pricing ignores stock-out and clearance timing |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Page views alone | confounded with traffic campaigns |
| Last week's price | autocorrelated with the policy itself |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Own-price elasticity inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: randomisation required for validity. |
| Competitor price index inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: matching must be accurate. |
| Days of cover inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: forecast as-of, not realised. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: dynamic_pricing_optimization_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: own_price_elasticity, type: double, nullable: false }
    - { name: competitor_price_index, type: double, nullable: false }
    - { name: days_of_cover, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Own-price elasticity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Competitor price index against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Own-price elasticity, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Olist Brazilian E-Commerce | https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce | CC BY-NC-SA 4.0 (see the dataset page) | 100K orders with items, payments, reviews, delivery times and seller data | One marketplace and year; useful for delivery, review and seller analyses. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| French Motor Third-Party Liability Claims | https://www.openml.org/d/41214 | Open licence on OpenML; see the dataset page | About 678,000 policies with exposure, claim counts and risk characteristics, the standard example for frequency modelling | One line of business in one country; no claim text, no payments over time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE dynamic_pricing_optimization_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE dynamic_pricing_optimization_outputs (
  run_id TEXT NOT NULL REFERENCES dynamic_pricing_optimization_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE dynamic_pricing_optimization_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE dynamic_pricing_optimization_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Dynamic Pricing Optimisation": Set prices per SKU and channel to maximise margin dollars under inventory, competitor and brand-guardrail constraints. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Price, promotion and demand | Price changes demand (elasticity), promotions pull sales forward or steal them from similar items (cannibalisation), and markdowns clear stock at the end of a season. Forecasts must treat promotions as known inputs, and price decisions as causal questions, not correlations. | Naively learning price from history confuses cause and effect: retailers discount slow items, so low prices correlate with low sales. |
| Inventory, replenishment and assortment | Stores and warehouses hold stock to meet uncertain demand. Replenishment decides when and how much to order, assortment planning decides which items to carry given limited shelf space, and substitution handles out-of-stock moments. Overstock ties up cash and expires; understock loses sales and customers. | Every forecast or recommendation has to respect stock: a perfect recommendation for an unavailable item is a failed one. |
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Own-price elasticity | Log-log slope from randomised price cells. Demand response. | Leakage risk to design against: Randomisation required for validity. |
| A signal-versus-noise trap in this use case: Causality | The true signal is causal elasticity from price experiments and instruments; the common noise is regressing sales on price. | Sellers raise price when demand is high, creating a positive confounded slope. |

**Ask the experts**

- [ ] What exactly does "Price-change frequency limits" mean in practice for dynamic pricing optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Own-price elasticity" and "Competitor price index", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Gross margin dollars" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: elasticities estimated from observational price changes, and who can confirm the cut-off times and splits?
- [ ] How often does "Competitor scraper returns wrong match" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| SKU | Stock-keeping unit: one distinct product variant such as a size and colour. |
| Elasticity | How much demand changes for a given change in price. |
| Markdown | A permanent price reduction applied to clear aging or excess stock. |
| Cannibalisation | A promotion on one item taking sales from a similar item rather than creating new demand. |
| Replenishment | Ordering or moving stock to restore inventory to target levels. |
| Product matching | Deciding whether two listings describe the same product. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Leave-last-out | Evaluation that hides each session's final item and asks the model to predict it from the rest. |
| AOV | Average order value: revenue divided by the number of orders. |
| Assortment | The set of products a store or channel chooses to carry. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
