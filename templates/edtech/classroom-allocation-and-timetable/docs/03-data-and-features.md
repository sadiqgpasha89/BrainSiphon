# Course Timetabling & Classroom Allocation: data and feature specification

> Generated from the blueprint `edtech/classroom-allocation-and-timetable` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Course Timetabling & Classroom Allocation · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Course Timetabling & Classroom Allocation": Allocate courses to times and rooms to maximise utilisation and student/teacher preferences under capacity and accessibility constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising on forecasts without uncertainty.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Enrolment forecast | predicted course enrolment | Capacity | Model |   |   |   |
| Travel time between rooms | campus distances | Feasibility | Maps |   |   |   |
| Teacher preferences | availability windows | Soft constraints | Survey |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Demand | Forecast enrolment before allocating rooms | Use last year's room sizes | Demand shifts by programme |
| Preferences | Weighted student and teacher preferences | Ignoring gaps | Gaps reduce attendance |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Course name | none |
| Department | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Enrolment forecast inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: model. |
| Travel time between rooms inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: maps. |
| Teacher preferences inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: survey. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: classroom_allocation_and_timetable_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: enrolment_forecast, type: double, nullable: false }
    - { name: travel_time_between_rooms, type: double, nullable: false }
    - { name: teacher_preferences, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Enrolment forecast and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Travel time between rooms against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Enrolment forecast, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE classroom_allocation_and_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE classroom_allocation_and_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES classroom_allocation_and_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE classroom_allocation_and_assignments (
  plan_id TEXT NOT NULL REFERENCES classroom_allocation_and_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE classroom_allocation_and_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Course Timetabling & Classroom Allocation": Allocate courses to times and rooms to maximise utilisation and student/teacher preferences under capacity and accessibility constraints. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Operations: timetabling, admissions and support | Institutions schedule exams and classrooms, match students to scholarships and programmes, answer admissions questions and triage support tickets. Constraints are hard (no clashes), fairness is audited, and stakeholders contest decisions. | Optimisation and scoring systems here are judged on feasibility and fairness, and every decision needs an explanation. |
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Enrolment forecast | Predicted course enrolment. Capacity. | Leakage risk to design against: Model. |
| A signal-versus-noise trap in this use case: Demand | The true signal is forecast enrolment before allocating rooms; the common noise is use last year's room sizes. | Demand shifts by programme. |

**Ask the experts**

- [ ] What exactly does "Hard constraints" mean in practice for course timetabling & classroom allocation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Enrolment forecast" and "Travel time between rooms", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Utilisation rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising on forecasts without uncertainty, and who can confirm the cut-off times and splits?
- [ ] How often does "Enrolment under-forecast" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Timetabling | Assigning courses, exams and rooms to time slots without clashes. |
| Hard / soft constraint | A rule that must not be broken versus a preference to be satisfied as far as possible. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Learning analytics | Using learner data to understand and improve learning and teaching. |
| Accessibility | Making content usable by people with disabilities, for example with alt text and captions. |
| Alt text | A text description of an image for people who cannot see it. |
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Distribution shift | A change in the data a model sees compared with training. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
