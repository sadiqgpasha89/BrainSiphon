# Evacuation Route Planning: data and feature specification

> Generated from the blueprint `public-safety/evacuation-route-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Evacuation Route Planning · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Evacuation Route Planning": Compute evacuation routes and staging that account for road capacity, hazards and vulnerable populations, so planners and commanders test and choose plans. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Free-flow assumptions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Road capacity and closures | live capacity of roads | Constraint | From traffic data |   |   |   |
| Hazard spread forecast | predicted fire or flood extent | Timing | From hazard models |   |   |   |
| Population by area and mode | residents and transport availability | Demand | From census and registers |   |   |   |
| Shelter and staging capacity | places available | Constraint | From operations |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Constraint | Road capacity and contraflow limits | Free-flow speed | Evacuation traffic exceeds normal capacity |
| Equity | Plans covering people without cars | Car-owner assumptions | Some residents cannot self-evacuate |
| Role | Planning and decision support | Autonomous instructions | Public instructions need command authority |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Planner name | irrelevant |
| Exercise label | an artefact |
| Map style | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Road capacity and closures inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from traffic data. |
| Hazard spread forecast inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from hazard models. |
| Population by area and mode inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from census and registers. |
| Shelter and staging capacity inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from operations. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: evacuation_route_planning_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: road_capacity_and_closures, type: double, nullable: false }
    - { name: hazard_spread_forecast, type: double, nullable: false }
    - { name: population_by_area_and_mode, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Road capacity and closures and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Hazard spread forecast against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Road capacity and closures, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE evacuation_route_planning_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE evacuation_route_planning_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES evacuation_route_planning_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE evacuation_route_planning_assignments (
  plan_id TEXT NOT NULL REFERENCES evacuation_route_planning_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE evacuation_route_planning_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Evacuation Route Planning": Compute evacuation routes and staging that account for road capacity, hazards and vulnerable populations, so planners and commanders test and choose plans. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Disasters evolve and information is incomplete | Floods, fires and storms change by the hour while reports are partial and sometimes wrong. Responders need situational awareness that shows uncertainty and source reliability. | A confident map built on unverified reports can send crews to the wrong place. |
| Road safety depends on exposure and context | Crash risk depends on road design, speed, traffic, weather and user mix, and crashes are rare events. Analysis works at the location and segment level and avoids singling out drivers. | Targeting individuals from location history raises privacy and fairness concerns. |
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Road capacity and closures | Live capacity of roads. Constraint. | Leakage risk to design against: From traffic data. |
| A signal-versus-noise trap in this use case: Constraint | The true signal is road capacity and contraflow limits; the common noise is free-flow speed. | Evacuation traffic exceeds normal capacity. |

**Ask the experts**

- [ ] What exactly does "Plans consider residents with mobility needs from consented registers" mean in practice for evacuation route planning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Road capacity and closures" and "Hazard spread forecast", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Evacuation clearance time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: free-flow assumptions, and who can confirm the cut-off times and splits?
- [ ] How often does "Blocked road" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Evacuation | Moving people out of a danger zone. |
| Flood extent | The area covered by floodwater. |
| Station coverage | How well stations can reach an area in the target time. |
| Incident command | A system for managing response at the scene. |
| Wildfire | An uncontrolled fire in vegetation. |
| Early warning | An alert sent before a hazard arrives. |
| Near miss | An event that almost caused a crash. |
| Speed management | Setting and enforcing speeds to cut harm. |
| False alarm | An alert with no real incident. |
| Human in the loop | A person reviews or approves the system's output. |
| Transitive closure | Adding links implied by chains of links; in clustering it merges groups that share one wrong edge. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Policy | The rule that maps a situation to an action. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
