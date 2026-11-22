# Quality Improvement Initiative Prioritization: data and feature specification

> Generated from the blueprint `healthcare/quality-improvement-initiative-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Quality Improvement Initiative Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Quality Improvement Initiative Prioritization": Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating estimated benefits as certain.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Expected patient impact | estimated harm avoided or outcomes gained with evidence grade | The core value | Estimates from the stated source |   |   |   |
| Compliance urgency | days to a mandatory deadline and penalty exposure | Hard drivers | Calendar |   |   |   |
| Feasibility | resource requirement against available capacity | Unrealistic projects waste effort | Current capacity |   |   |   |
| Equity benefit | expected reduction in disparities by group | Makes equity explicit | Group definitions agreed in advance |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Method | Multi-criteria decision analysis with explicit weights | Single opaque score | Leaders must be able to challenge a ranking |
| Evidence | Evidence strength as a criterion and an uncertainty | Point benefit estimate | Weak evidence deserves a discount |
| Constraints | Budget and capacity as hard limits | Ranking without limits | A ranked list leaves the budget problem unsolved |
| Compliance | Mandatory projects fixed in the portfolio | Everything scored equally | Compliance deadlines are not optional |
| Sensitivity | Rank stability across weight changes | One weight set | A fragile top choice should be seen |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Sponsor seniority | pressure not merit |
| Project name or branding | not value |
| Past project success rate of the team | confounded |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Expected patient impact inputs | Quality and patient safety | Quality management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: estimates from the stated source. |
| Compliance urgency inputs | Strategy office | Project and portfolio tracking | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calendar. |
| Feasibility inputs | Finance | Finance and budget system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: current capacity. |
| Equity benefit inputs | Health equity office | Quality gap and incident repositories | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: group definitions agreed in advance. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: quality_improvement_initiative_inputs.v1
owner: quality-and-patient-safety@example.com
system_of_record: Quality management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: expected_patient_impact, type: double, nullable: false }
    - { name: compliance_urgency, type: double, nullable: false }
    - { name: feasibility, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Expected patient impact and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Compliance urgency against Quality management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Expected patient impact, traces back to Quality management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE quality_improvement_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE quality_improvement_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES quality_improvement_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE quality_improvement_assignments (
  plan_id TEXT NOT NULL REFERENCES quality_improvement_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE quality_improvement_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Quality Improvement Initiative Prioritization": Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Definitions: Sepsis-3, SIRS and qSOFA | Sepsis-3 defines sepsis as suspected infection plus an acute rise of 2 or more points in the SOFA organ-failure score, and septic shock as sepsis that needs vasopressors to keep blood pressure up and has lactate above 2 mmol/L despite fluids. Older screening tools are still used: SIRS (two of abnormal temperature, heart rate, breathing rate or white cell count) and qSOFA (fast breathing, low systolic pressure, altered mentation). | Which definition you label with changes prevalence, onset time and what the model learns, so pick it with clinicians and write it down. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Expected patient impact | Estimated harm avoided or outcomes gained with evidence grade. The core value. | Leakage risk to design against: Estimates from the stated source. |
| A signal-versus-noise trap in this use case: Method | The true signal is multi-criteria decision analysis with explicit weights; the common noise is single opaque score. | Leaders must be able to challenge a ranking. |

**Ask the experts**

- [ ] What exactly does "Leadership sets criteria weights and makes the final portfolio decision" mean in practice for quality improvement initiative prioritization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Expected patient impact" and "Compliance urgency", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Realised benefit of selected projects" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating estimated benefits as certain, and who can confirm the cut-off times and splits?
- [ ] How often does "Weights disputed" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Policy | The rule that maps a situation to an action. |
| Discount factor | How much a future reward is worth compared with the same reward now. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| p99 latency | The time within which 99% of requests complete. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
