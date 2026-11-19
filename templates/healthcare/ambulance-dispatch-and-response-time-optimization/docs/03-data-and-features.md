# Ambulance Dispatch & Positioning: data and feature specification

> Generated from the blueprint `healthcare/ambulance-dispatch-and-response-time-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ambulance Dispatch & Positioning · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ambulance Dispatch & Positioning": Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulation uses historical calls ignoring policy effects.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Spatiotemporal demand intensity | forecast calls per grid cell-hour | Positioning | Forecast not actual |   |   |   |
| Travel-time estimate | live-traffic ETA | Dispatch | Live feed |   |   |   |
| Unit availability state | crew and vehicle status | Feasibility | Real-time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Priority | Priority-weighted response objective | Average response time | Averages hide failures for high-priority calls |
| Demand | Spatiotemporal demand forecasts for repositioning | Static base stations | Demand shifts by hour and event |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Dispatcher ID | personal |
| Call centre queue length | operational |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Spatiotemporal demand intensity inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: forecast not actual. |
| Travel-time estimate inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: live feed. |
| Unit availability state inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: real-time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ambulance_dispatch_and_response_time_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: spatiotemporal_demand_intensity, type: double, nullable: false }
    - { name: travel_time_estimate, type: double, nullable: false }
    - { name: unit_availability_state, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Spatiotemporal demand intensity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Travel-time estimate against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Spatiotemporal demand intensity, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE ambulance_dispatch_and_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE ambulance_dispatch_and_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES ambulance_dispatch_and_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE ambulance_dispatch_and_assignments (
  plan_id TEXT NOT NULL REFERENCES ambulance_dispatch_and_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE ambulance_dispatch_and_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Ambulance Dispatch & Positioning": Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Spatiotemporal demand intensity | Forecast calls per grid cell-hour. Positioning. | Leakage risk to design against: Forecast not actual. |
| A signal-versus-noise trap in this use case: Priority | The true signal is priority-weighted response objective; the common noise is average response time. | Averages hide failures for high-priority calls. |

**Ask the experts**

- [ ] What exactly does "Decision under 100 ms" mean in practice for ambulance dispatch & positioning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Spatiotemporal demand intensity" and "Travel-time estimate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "90th percentile response time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: simulation uses historical calls ignoring policy effects, and who can confirm the cut-off times and splits?
- [ ] How often does "Mass-casualty incident" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Policy | The rule that maps a situation to an action. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
