# Provider Onboarding Cycle-Time Optimization: data and feature specification

> Generated from the blueprint `healthcare/provider-onboarding-cycle-time-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Onboarding Cycle-Time Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Onboarding Cycle-Time Optimization": Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learning order from history rather than rules.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Critical-path slack | latest start minus earliest start for each open task | Identifies tasks that drive the date | Use the dependency graph at scoring time |   |   |   |
| Queue wait time | median waiting time before a task is picked up by the owner team | Shows capacity limits | Event timestamps |   |   |   |
| Rework rate | share of tasks reopened for missing information | Quality of handoff | Past cycles only |   |   |   |
| Predicted start-readiness | modelled completion date of the slowest required stream | The headline outcome | Computed from open tasks and queue state |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Dependencies | Explicit prerequisite graph | Inferred order from average timing | Order inferred from history repeats past mistakes |
| Bottleneck | Queue and handoff delay at a stage | The slowest task by duration | A short task with long waiting is the real constraint |
| Prediction | Remaining-time estimate with interval per case | Standard duration | Cases differ widely by specialty and facility |
| Authority | Recommendation for the owner to approve | Automatic reassignment | Owners are accountable for their tasks |
| Mandatory steps | Hard prerequisites enforced | Fast path that skips verification | Safety and compliance checks are not negotiable |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Task owner seniority | not a cause of delay |
| Calendar month alone | mixes many causes |
| Provider specialty prestige | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Critical-path slack inputs | Provider onboarding office | Onboarding workflow system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the dependency graph at scoring time. |
| Queue wait time inputs | HR operations | HR information system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event timestamps. |
| Rework rate inputs | IT service management | Credentialing system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: past cycles only. |
| Predicted start-readiness inputs | Facilities | IT access management and facilities request systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: computed from open tasks and queue state. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_onboarding_cycle_time_inputs.v1
owner: provider-onboarding-office@example.com
system_of_record: Onboarding workflow system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: critical_path_slack, type: double, nullable: false }
    - { name: queue_wait_time, type: double, nullable: false }
    - { name: rework_rate, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Critical-path slack and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Queue wait time against Onboarding workflow system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Critical-path slack, traces back to Onboarding workflow system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE provider_onboarding_cycle_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE provider_onboarding_cycle_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES provider_onboarding_cycle_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE provider_onboarding_cycle_assignments (
  plan_id TEXT NOT NULL REFERENCES provider_onboarding_cycle_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE provider_onboarding_cycle_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Onboarding Cycle-Time Optimization": Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Definitions: Sepsis-3, SIRS and qSOFA | Sepsis-3 defines sepsis as suspected infection plus an acute rise of 2 or more points in the SOFA organ-failure score, and septic shock as sepsis that needs vasopressors to keep blood pressure up and has lactate above 2 mmol/L despite fluids. Older screening tools are still used: SIRS (two of abnormal temperature, heart rate, breathing rate or white cell count) and qSOFA (fast breathing, low systolic pressure, altered mentation). | Which definition you label with changes prevalence, onset time and what the model learns, so pick it with clinicians and write it down. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Critical-path slack | Latest start minus earliest start for each open task. Identifies tasks that drive the date. | Leakage risk to design against: Use the dependency graph at scoring time. |
| A signal-versus-noise trap in this use case: Dependencies | The true signal is explicit prerequisite graph; the common noise is inferred order from average timing. | Order inferred from history repeats past mistakes. |

**Ask the experts**

- [ ] What exactly does "Owners approve every task reassignment and every start-date change" mean in practice for provider onboarding cycle-time optimization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Critical-path slack" and "Queue wait time", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Days from offer to start-readiness" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: learning order from history rather than rules, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing events from one system" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
