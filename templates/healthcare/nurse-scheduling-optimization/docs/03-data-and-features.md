# Nurse Scheduling Optimisation: data and feature specification

> Generated from the blueprint `healthcare/nurse-scheduling-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Nurse Scheduling Optimisation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Nurse Scheduling Optimisation": Generate fair shift schedules that meet predicted patient demand and skill mix while respecting preferences and labour rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating only on forecast demand.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Acuity-weighted demand forecast | workload units per shift | Staffing target | Forecast quality |   |   |   |
| Preference satisfaction score | fraction of requests honoured | Retention | Fair allocation |   |   |   |
| Skill coverage per shift | required competencies present | Safety | Credential data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Demand | Acuity-based demand forecast | Fixed nurse-to-patient ratios | Acuity changes workload |
| Fairness | Transparent fairness metrics | Opaque heuristics | Nurses reject unfair schedules |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Nurse name | none |
| Seniority alone | fairness |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Acuity-weighted demand forecast inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: forecast quality. |
| Preference satisfaction score inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: fair allocation. |
| Skill coverage per shift inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: credential data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: nurse_scheduling_optimization_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: acuity_weighted_demand_forecast, type: double, nullable: false }
    - { name: preference_satisfaction_score, type: double, nullable: false }
    - { name: skill_coverage_per_shift, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Acuity-weighted demand forecast and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Preference satisfaction score against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Acuity-weighted demand forecast, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE nurse_scheduling_optimization_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE nurse_scheduling_optimization_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES nurse_scheduling_optimization_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE nurse_scheduling_optimization_assignments (
  plan_id TEXT NOT NULL REFERENCES nurse_scheduling_optimization_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE nurse_scheduling_optimization_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Nurse Scheduling Optimisation": Generate fair shift schedules that meet predicted patient demand and skill mix while respecting preferences and labour rules. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Acuity-weighted demand forecast | Workload units per shift. Staffing target. | Leakage risk to design against: Forecast quality. |
| A signal-versus-noise trap in this use case: Demand | The true signal is acuity-based demand forecast; the common noise is fixed nurse-to-patient ratios. | Acuity changes workload. |

**Ask the experts**

- [ ] What exactly does "Labour regulations" mean in practice for nurse scheduling optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Acuity-weighted demand forecast" and "Preference satisfaction score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Overtime cost" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating only on forecast demand, and who can confirm the cut-off times and splits?
- [ ] How often does "Sudden call-outs" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Heuristic / local search | Fast methods that find good but not provably optimal solutions. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Distribution shift | A change in the data a model sees compared with training. |
| p99 latency | The time within which 99% of requests complete. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
