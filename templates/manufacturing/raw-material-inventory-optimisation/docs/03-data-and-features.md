# Raw Material Inventory Optimisation: data and feature specification

> Generated from the blueprint `manufacturing/raw-material-inventory-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Raw Material Inventory Optimisation · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Raw Material Inventory Optimisation": Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Average-based safety stock.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Demand forecast with intervals | quantile forecast from the production plan | Demand uncertainty | From planning |   |   |   |
| Lead time distribution | supplier median and p90 lead time | Replenishment risk | From receipts |   |   |   |
| Shelf life and storage limits | days of life left and capacity | Constraints | From the material master |   |   |   |
| Shortage cost | line downtime cost per day | Sets the service level | From finance |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Uncertainty | Lead time and demand distributions | Average values | Averages hide the tail that causes stock-outs |
| Policy | Service level tied to the cost of shortage | One level for all | Critical materials need more cover |
| Constraint | Supplier minimums and shelf life | Pure cost minimisation | Infeasible orders get ignored |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Buyer name | irrelevant |
| Warehouse code | an identifier |
| Order number | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Demand forecast with intervals inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from planning. |
| Lead time distribution inputs | Quality engineering | ERP and production planning | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from receipts. |
| Shelf life and storage limits inputs | Reliability and maintenance | CMMS or EAM maintenance system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the material master. |
| Shortage cost inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from finance. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: raw_material_inventory_optimisation_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: demand_forecast_with_intervals, type: double, nullable: false }
    - { name: lead_time_distribution, type: double, nullable: false }
    - { name: shelf_life_and_storage_limits, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Demand forecast with intervals and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Lead time distribution against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Demand forecast with intervals, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE raw_material_inventory_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE raw_material_inventory_outputs (
  run_id TEXT NOT NULL REFERENCES raw_material_inventory_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE raw_material_inventory_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE raw_material_inventory_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Raw Material Inventory Optimisation": Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Planning and scheduling are constraint problems | Production plans must respect machine capabilities, changeover times, material availability, labour and due dates. Small disruptions force a re-plan. | A forecast alone is not a plan, so models need to feed an optimiser that respects the constraints. |
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Demand forecast with intervals | Quantile forecast from the production plan. Demand uncertainty. | Leakage risk to design against: From planning. |
| A signal-versus-noise trap in this use case: Uncertainty | The true signal is lead time and demand distributions; the common noise is average values. | Averages hide the tail that causes stock-outs. |

**Ask the experts**

- [ ] What exactly does "Service level targets by criticality" mean in practice for raw material inventory optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Demand forecast with intervals" and "Lead time distribution", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Stock-outs" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: average-based safety stock, and who can confirm the cut-off times and splits?
- [ ] How often does "Supplier disruption" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Kanban | A pull system that signals when to make or move more material. |
| Supplier quality | The quality of incoming materials from suppliers. |
| MES | Manufacturing execution system: software that tracks production on the shop floor. |
| Changeover | The time to switch a machine from one product to another. |
| RUL | Remaining useful life: the time before a component should be replaced. |
| Digital twin | A model of a machine or plant kept in step with real data. |
| Bill of materials | The list of parts and materials needed to make a product. |
| Work order | An instruction to produce or repair something. |
| APS | Advanced planning and scheduling software. |
| FMEA | Failure mode and effects analysis: a structured review of how a design or process can fail. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Distribution shift | A change in the data a model sees compared with training. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
