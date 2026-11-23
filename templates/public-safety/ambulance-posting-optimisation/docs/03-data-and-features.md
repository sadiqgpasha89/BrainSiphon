# Ambulance Posting Optimisation: data and feature specification

> Generated from the blueprint `public-safety/ambulance-posting-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ambulance Posting Optimisation · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ambulance Posting Optimisation": Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Average-time objectives.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Unit status and location | available units and positions | State | From AVL |   |   |   |
| Demand forecast by zone | expected calls | Need | From forecast |   |   |   |
| Travel time estimates | road travel times | Cost | From traffic data |   |   |   |
| Coverage gaps | zones outside the target time | Priority | Computed |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | Expected response time with a coverage floor | Average response time | Averages leave some areas poorly covered |
| Constraint | Crew rules and legal coverage | Pure optimisation | Practical limits matter |
| Evaluation | Simulation of historical demand | Raw before-and-after | Demand varies by day |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Crew name | irrelevant |
| Vehicle number | an identifier |
| Station nickname | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Unit status and location inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from AVL. |
| Demand forecast by zone inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from forecast. |
| Travel time estimates inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from traffic data. |
| Coverage gaps inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: computed. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ambulance_posting_optimisation_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: unit_status_and_location, type: double, nullable: false }
    - { name: demand_forecast_by_zone, type: double, nullable: false }
    - { name: travel_time_estimates, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Unit status and location and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Demand forecast by zone against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Unit status and location, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE ambulance_posting_optimisation_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE ambulance_posting_optimisation_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES ambulance_posting_optimisation_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE ambulance_posting_optimisation_assignments (
  plan_id TEXT NOT NULL REFERENCES ambulance_posting_optimisation_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE ambulance_posting_optimisation_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Ambulance Posting Optimisation": Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Dispatch is a resource allocation problem | Units differ in capability, position and availability, and demand is uneven across place and time. Good dispatch balances fast response with coverage for the next call. | Sending the nearest unit each time can leave an area uncovered, so coverage must be modelled. |
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Road safety depends on exposure and context | Crash risk depends on road design, speed, traffic, weather and user mix, and crashes are rare events. Analysis works at the location and segment level and avoids singling out drivers. | Targeting individuals from location history raises privacy and fairness concerns. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Unit status and location | Available units and positions. State. | Leakage risk to design against: From AVL. |
| A signal-versus-noise trap in this use case: Objective | The true signal is expected response time with a coverage floor; the common noise is average response time. | Averages leave some areas poorly covered. |

**Ask the experts**

- [ ] What exactly does "Coverage targets in every zone" mean in practice for ambulance posting optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Unit status and location" and "Demand forecast by zone", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Response time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: average-time objectives, and who can confirm the cut-off times and splits?
- [ ] How often does "Major incident" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| Response time | The time from call to arrival of help. |
| Unit | A vehicle or team available for dispatch. |
| Station coverage | How well stations can reach an area in the target time. |
| Triage | Sorting incidents by urgency. |
| Dispatch protocol | A scripted set of questions that decides the response level. |
| ANI and ALI | Caller number and location information delivered with a call. |
| Incident command | A system for managing response at the scene. |
| Crash hotspot | A location with many crashes. |
| Black spot | A road location with a high crash record. |
| Reward | The number the system tries to maximise over time. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
