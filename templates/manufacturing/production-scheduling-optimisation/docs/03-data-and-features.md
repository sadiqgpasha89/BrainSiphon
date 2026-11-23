# Production Scheduling Optimisation: data and feature specification

> Generated from the blueprint `manufacturing/production-scheduling-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Production Scheduling Optimisation · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Production Scheduling Optimisation": Build and repair finite-capacity production schedules that respect machines, tooling, materials and due dates, so delivery performance rises and changeovers and idle time fall. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Planning on nominal capacity.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Predicted processing time | duration model by product, machine and tool | Plan realism | Use confirmed durations |   |   |   |
| Sequence-dependent changeover | changeover minutes between product pairs | Shapes the sequence | From the changeover matrix |   |   |   |
| Material availability | confirmed arrival dates of inputs | Feasibility | From ERP |   |   |   |
| Order priority and due date slack | days to due date and customer priority | Objective weights | From orders |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Constraint | Real machine, tool and labour availability | A nominal capacity table | Plans on paper fail on the floor |
| Objective | Weighted lateness, changeover and inventory cost | Utilisation | High utilisation creates long queues and late orders |
| Change | Rolling re-plans with stability limits | A new plan every time | Constant reshuffles stop the floor from trusting the plan |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Planner name | not a plan driver |
| Order entry channel | not a plan driver |
| Machine asset tag | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Predicted processing time inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: use confirmed durations. |
| Sequence-dependent changeover inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the changeover matrix. |
| Material availability inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from ERP. |
| Order priority and due date slack inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from orders. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: production_scheduling_optimisation_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: predicted_processing_time, type: double, nullable: false }
    - { name: sequence_dependent_changeover, type: double, nullable: false }
    - { name: material_availability, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Predicted processing time and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Sequence-dependent changeover against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Predicted processing time, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE production_scheduling_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE production_scheduling_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES production_scheduling_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE production_scheduling_assignments (
  plan_id TEXT NOT NULL REFERENCES production_scheduling_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE production_scheduling_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Production Scheduling Optimisation": Build and repair finite-capacity production schedules that respect machines, tooling, materials and due dates, so delivery performance rises and changeovers and idle time fall. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Planning and scheduling are constraint problems | Production plans must respect machine capabilities, changeover times, material availability, labour and due dates. Small disruptions force a re-plan. | A forecast alone is not a plan, so models need to feed an optimiser that respects the constraints. |
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Predicted processing time | Duration model by product, machine and tool. Plan realism. | Leakage risk to design against: Use confirmed durations. |
| A signal-versus-noise trap in this use case: Constraint | The true signal is real machine, tool and labour availability; the common noise is a nominal capacity table. | Plans on paper fail on the floor. |

**Ask the experts**

- [ ] What exactly does "Hard constraints on capacity, tooling and shift calendars" mean in practice for production scheduling optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Predicted processing time" and "Sequence-dependent changeover", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "On-time delivery" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: planning on nominal capacity, and who can confirm the cut-off times and splits?
- [ ] How often does "Machine breakdown" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| MES | Manufacturing execution system: software that tracks production on the shop floor. |
| Work order | An instruction to produce or repair something. |
| APS | Advanced planning and scheduling software. |
| Changeover | The time to switch a machine from one product to another. |
| CMMS | Computerised maintenance management system for work orders and assets. |
| Digital twin | A model of a machine or plant kept in step with real data. |
| Bill of materials | The list of parts and materials needed to make a product. |
| Downtime | Time when a machine is not producing. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| Heuristic / local search | Fast methods that find good but not provably optimal solutions. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Reward | The number the system tries to maximise over time. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
