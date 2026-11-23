# Field Technician Dispatch Optimisation: data and feature specification

> Generated from the blueprint `telecom/field-technician-dispatch-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Field Technician Dispatch Optimisation · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Field Technician Dispatch Optimisation": Assign and route field technicians to installs and repairs by skills, parts, location and customer commitments so more jobs complete on time with less travel. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed standard times.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Predicted job duration | model of duration by job type, site and technician skill | Plan accuracy | Use confirmed durations |   |   |   |
| Travel time matrix | road travel time by period | Route cost | Traffic aware |   |   |   |
| Parts availability | parts in the vehicle or depot | Avoids repeat visits | Live stock |   |   |   |
| Customer appointment window | commitment time and priority | Constraints | From orders |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | On-time completion weighted by priority and cost | Utilisation alone | High utilisation produces late jobs |
| Estimate | Job duration predicted from job type and history | Fixed standard times | Durations vary widely |
| Change | Re-optimise as jobs overrun | Plan once in the morning | Real days break plans |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Technician name | irrelevant |
| Vehicle colour | irrelevant |
| Ticket text length | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Predicted job duration inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: use confirmed durations. |
| Travel time matrix inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: traffic aware. |
| Parts availability inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: live stock. |
| Customer appointment window inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from orders. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: field_technician_dispatch_optimisation_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: predicted_job_duration, type: double, nullable: false }
    - { name: travel_time_matrix, type: double, nullable: false }
    - { name: parts_availability, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Predicted job duration and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Travel time matrix against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Predicted job duration, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE field_technician_dispatch_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE field_technician_dispatch_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES field_technician_dispatch_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE field_technician_dispatch_assignments (
  plan_id TEXT NOT NULL REFERENCES field_technician_dispatch_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE field_technician_dispatch_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Field Technician Dispatch Optimisation": Assign and route field technicians to installs and repairs by skills, parts, location and customer commitments so more jobs complete on time with less travel. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Capacity is planned for the busy hour | Traffic is forecast per cell and per link for the busiest period, with growth from new devices, video and events. Spectrum and backhaul upgrades take months, so forecasts must be early and carry uncertainty. | Planning on average load causes congestion at peak, while over-building wastes capital. |
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Predicted job duration | Model of duration by job type, site and technician skill. Plan accuracy. | Leakage risk to design against: Use confirmed durations. |
| A signal-versus-noise trap in this use case: Objective | The true signal is on-time completion weighted by priority and cost; the common noise is utilisation alone. | High utilisation produces late jobs. |

**Ask the experts**

- [ ] What exactly does "Skills, parts and working-time rules as hard constraints" mean in practice for field technician dispatch optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Predicted job duration" and "Travel time matrix", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "On-time completion" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: fixed standard times, and who can confirm the cut-off times and splits?
- [ ] How often does "Emergency job" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Truck roll | Sending a field technician to a site. |
| SLA | Service level agreement: the availability or performance a provider commits to. |
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| PRB | Physical resource block: the unit of radio capacity allocated to users in a cell. |
| Backhaul | The link that carries traffic from a cell site to the core network. |
| Provisioning | Configuring the network and systems so a purchased service works. |
| Self-organising network | Network automation that tunes and heals radio parameters with little manual work. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Policy | The rule that maps a situation to an action. |
| Reward | The number the system tries to maximise over time. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
