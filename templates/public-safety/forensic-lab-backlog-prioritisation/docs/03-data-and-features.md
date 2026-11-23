# Forensic Lab Backlog Prioritisation: data and feature specification

> Generated from the blueprint `public-safety/forensic-lab-backlog-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Forensic Lab Backlog Prioritisation · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Forensic Lab Backlog Prioritisation": Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fastest-throughput objectives.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Days to court or statutory deadline | time remaining | Priority | From case systems |   |   |   |
| Case seriousness class | offence class | Priority | From case systems |   |   |   |
| Analysis effort estimate | estimated hours by test | Planning | From history |   |   |   |
| Capacity by discipline | analyst hours available | Constraint | From the lab system |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Goal | Deadlines met and the most serious cases prioritised | Fastest throughput | Throughput can leave urgent cases waiting |
| Rules | Legal deadlines are fixed | Model predictions of urgency | The law sets deadlines |
| Fairness | Equal treatment of equal cases | Priority for some neighbourhoods | Unequal priority harms justice |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Suspect name | personal data |
| Neighbourhood | a proxy |
| Submitting officer | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Days to court or statutory deadline inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from case systems. |
| Case seriousness class inputs | Operations and investigations leadership | Records management and evidence systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from case systems. |
| Analysis effort estimate inputs | Chief data and ethics officer | Court case management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from history. |
| Capacity by discipline inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the lab system. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: forensic_lab_backlog_prioritisation_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: days_to_court_or_statutory_deadline, type: double, nullable: false }
    - { name: case_seriousness_class, type: double, nullable: false }
    - { name: analysis_effort_estimate, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Days to court or statutory deadline and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Case seriousness class against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Days to court or statutory deadline, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE forensic_lab_backlog_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE forensic_lab_backlog_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES forensic_lab_backlog_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE forensic_lab_backlog_assignments (
  plan_id TEXT NOT NULL REFERENCES forensic_lab_backlog_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE forensic_lab_backlog_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Forensic Lab Backlog Prioritisation": Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Courts and justice need transparency | Case scheduling, document handling and records support the courts, but decisions about guilt, sentence and bail belong to judges. Tools must be transparent and open to challenge. | A tool that influences a liberty decision needs a legal basis, validation and disclosure to the parties. |
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Days to court or statutory deadline | Time remaining. Priority. | Leakage risk to design against: From case systems. |
| A signal-versus-noise trap in this use case: Goal | The true signal is deadlines met and the most serious cases prioritised; the common noise is fastest throughput. | Throughput can leave urgent cases waiting. |

**Ask the experts**

- [ ] What exactly does "Statutory and court deadlines as rules" mean in practice for forensic lab backlog prioritisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Days to court or statutory deadline" and "Case seriousness class", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cases past deadline" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: fastest-throughput objectives, and who can confirm the cut-off times and splits?
- [ ] How often does "Late urgent request" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Case backlog | Cases waiting to be heard or resolved. |
| Docket | A list of cases scheduled for court. |
| E-discovery | Finding and reviewing electronic documents for a case. |
| Triage | Sorting incidents by urgency. |
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| Response time | The time from call to arrival of help. |
| Hazard | A source of potential harm. |
| Damage assessment | Estimating the harm after a disaster. |
| Bail | Release of an accused person before trial. |
| Algorithmic impact assessment | A review of the effects of an automated system. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Reward | The number the system tries to maximise over time. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
