# Assortment Planning & Space Optimisation: data and feature specification

> Generated from the blueprint `retail/assortment-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Assortment Planning & Space Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Assortment Planning & Space Optimisation": Choose which SKUs each store cluster carries to maximise margin given space limits, substitution and local demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using sales as demand when items were unavailable.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Substitution matrix | estimated demand transfer between SKUs | True marginal value | Estimated from stock-out natural experiments |   |   |   |
| Local demand index | category share vs chain average | Localisation | Normalise by store traffic |   |   |   |
| Space elasticity | sales response to facings | Optimisation input | Controlled planogram tests |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Substitution | Demand transfer when an item is removed | Sum of item sales | Removing a SKU moves 30-70% of its demand to substitutes |
| Clusters | Behavioural store clusters | Store size tiers | Same-size stores can have totally different mixes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Absolute sales rank | ignores substitutability |
| Supplier promotions | temporary distortions |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Substitution matrix inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: estimated from stock-out natural experiments. |
| Local demand index inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: normalise by store traffic. |
| Space elasticity inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: controlled planogram tests. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: assortment_planning_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: substitution_matrix, type: double, nullable: false }
    - { name: local_demand_index, type: double, nullable: false }
    - { name: space_elasticity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Substitution matrix and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Local demand index against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Substitution matrix, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE assortment_planning_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE assortment_planning_outputs (
  run_id TEXT NOT NULL REFERENCES assortment_planning_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE assortment_planning_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE assortment_planning_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Assortment Planning & Space Optimisation": Choose which SKUs each store cluster carries to maximise margin given space limits, substitution and local demand. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Inventory, replenishment and assortment | Stores and warehouses hold stock to meet uncertain demand. Replenishment decides when and how much to order, assortment planning decides which items to carry given limited shelf space, and substitution handles out-of-stock moments. Overstock ties up cash and expires; understock loses sales and customers. | Every forecast or recommendation has to respect stock: a perfect recommendation for an unavailable item is a failed one. |
| Price, promotion and demand | Price changes demand (elasticity), promotions pull sales forward or steal them from similar items (cannibalisation), and markdowns clear stock at the end of a season. Forecasts must treat promotions as known inputs, and price decisions as causal questions, not correlations. | Naively learning price from history confuses cause and effect: retailers discount slow items, so low prices correlate with low sales. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Substitution matrix | Estimated demand transfer between SKUs. True marginal value. | Leakage risk to design against: Estimated from stock-out natural experiments. |
| A signal-versus-noise trap in this use case: Substitution | The true signal is demand transfer when an item is removed; the common noise is sum of item sales. | Removing a SKU moves 30-70% of its demand to substitutes. |

**Ask the experts**

- [ ] What exactly does "Shelf space per store" mean in practice for assortment planning & space optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Substitution matrix" and "Local demand index", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Margin per square foot" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using sales as demand when items were unavailable, and who can confirm the cut-off times and splits?
- [ ] How often does "Out-of-stock events distort demand" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Planogram | A diagram of how products should be arranged on shelves. |
| SKU | Stock-keeping unit: one distinct product variant such as a size and colour. |
| Cannibalisation | A promotion on one item taking sales from a similar item rather than creating new demand. |
| Assortment | The set of products a store or channel chooses to carry. |
| Elasticity | How much demand changes for a given change in price. |
| Replenishment | Ordering or moving stock to restore inventory to target levels. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
