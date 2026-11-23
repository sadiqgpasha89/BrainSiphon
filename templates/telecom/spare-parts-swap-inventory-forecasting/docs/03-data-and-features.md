# Spare Parts & Swap Inventory Forecasting: data and feature specification

> Generated from the blueprint `telecom/spare-parts-swap-inventory-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spare Parts & Swap Inventory Forecasting · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Spare Parts & Swap Inventory Forecasting": Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed lead times.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Installed base by age | count of units by age band | Failure exposure | From asset records |   |   |   |
| Failure rate by part type | failures per thousand unit-months | Core driver | From repair data |   |   |   |
| Supplier lead time | median and p90 lead time | Reorder timing | From purchase orders |   |   |   |
| Planned rollout | upcoming installs and upgrades | Demand shift | From the project plan |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Demand | Failure rate times installed base | Past issues only | Installed base changes drive failures |
| Lead time | Supplier lead time distributions | A fixed lead time | Variable lead times cause stock-outs |
| Intermittent | Methods for slow-moving parts | Averages | Many parts sell once a quarter |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Depot manager | irrelevant |
| Part colour | irrelevant |
| Order number | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Installed base by age inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from asset records. |
| Failure rate by part type inputs | OSS/BSS platform team | BSS: CRM, order management and billing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from repair data. |
| Supplier lead time inputs | Customer data office | Network element configuration and orchestration layer | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from purchase orders. |
| Planned rollout inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the project plan. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: spare_parts_swap_inventory_forecasting_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: installed_base_by_age, type: double, nullable: false }
    - { name: failure_rate_by_part_type, type: double, nullable: false }
    - { name: supplier_lead_time, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Installed base by age and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Failure rate by part type against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Installed base by age, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE spare_parts_swap_inventory_forecasts (
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
CREATE TABLE spare_parts_swap_inventory_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE spare_parts_swap_inventory_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Spare Parts & Swap Inventory Forecasting": Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Provisioning turns an order into a working service | Activation spans order capture, inventory, number and SIM assignment, network configuration and billing set-up across OSS and BSS systems. Failures often come from data mismatches between those systems. | Fall-out in the middle of a multi-system flow leaves a paying customer without service, so orders need compensating steps and clear status. |
| Capacity is planned for the busy hour | Traffic is forecast per cell and per link for the busiest period, with growth from new devices, video and events. Spectrum and backhaul upgrades take months, so forecasts must be early and carry uncertainty. | Planning on average load causes congestion at peak, while over-building wastes capital. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Installed base by age | Count of units by age band. Failure exposure. | Leakage risk to design against: From asset records. |
| A signal-versus-noise trap in this use case: Demand | The true signal is failure rate times installed base; the common noise is past issues only. | Installed base changes drive failures. |

**Ask the experts**

- [ ] What exactly does "Forecast by part and depot with intervals" mean in practice for spare parts & swap inventory forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Installed base by age" and "Failure rate by part type", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Stock-outs" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: fixed lead times, and who can confirm the cut-off times and splits?
- [ ] How often does "New part" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| Provisioning | Configuring the network and systems so a purchased service works. |
| Order fall-out | An order that fails part way through a multi-system flow. |
| Mediation | The system that collects and normalises usage records before billing. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
