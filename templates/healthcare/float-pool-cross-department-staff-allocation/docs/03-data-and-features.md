# Float Pool & Cross-Department Staff Allocation: data and feature specification

> Generated from the blueprint `healthcare/float-pool-cross-department-staff-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Float Pool & Cross-Department Staff Allocation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Float Pool & Cross-Department Staff Allocation": Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring plans on forecast shortage only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Coverage gain | reduction in unmet required hours if the person is assigned | Direct measure of value of each assignment | Use the shortage list at solve time |   |   |   |
| Continuity score | prior shifts the person worked on the receiving unit | Familiarity reduces risk and handover cost | Count only completed past shifts |   |   |   |
| Float burden | float shifts in the trailing 8 weeks relative to the pool median | Keeps the load fair and the pool willing | Window must end before the solve |   |   |   |
| Travel and rest margin | hours of rest and travel time between consecutive assignments | Prevents unsafe back-to-back moves | Use the published roster at solve time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Eligibility | Competency and licensure verified for the unit at the shift date | Matching on job title | A nurse with the right title may lack the unit competency |
| Fairness | Float burden distributed across the pool with a transparent metric | Always floating the most flexible people | Flexible staff burn out and leave |
| Objective | Weighted coverage gain with continuity and cost as explicit terms | Minimising cost alone | A cheap plan leaves the sickest unit short |
| Explanation | Reason codes for every rejected candidate | A single opaque rank | Managers reject plans they cannot interrogate |
| Fallback | Greedy feasible plan when the solver times out | No plan | The staffing office must still staff the shift |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Seniority alone | does not equal unit competency and entrenches the same people floating |
| Past acceptance of incentives | confounds willingness with need |
| Unit manager preference ranking | informal and unfair when used as a score |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Coverage gain inputs | Float pool office | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the shortage list at solve time. |
| Continuity score inputs | Nursing education and competency | Credentialing and competency records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: count only completed past shifts. |
| Float burden inputs | Labour relations | Labour-rules and collective-agreement register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window must end before the solve. |
| Travel and rest margin inputs | Float pool office | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the published roster at solve time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: float_pool_cross_department_staff_inputs.v1
owner: float-pool-office@example.com
system_of_record: Workforce management and scheduling system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: coverage_gain, type: double, nullable: false }
    - { name: continuity_score, type: double, nullable: false }
    - { name: float_burden, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Coverage gain and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Continuity score against Workforce management and scheduling system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Coverage gain, traces back to Workforce management and scheduling system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Duolingo half-life regression data | https://github.com/duolingo/halflife-regression | CC BY-NC 4.0 (see the repository) | Learner review logs with recall outcomes for spaced-repetition modelling | One app and language-learning domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE float_pool_cross_department_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE float_pool_cross_department_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES float_pool_cross_department_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE float_pool_cross_department_assignments (
  plan_id TEXT NOT NULL REFERENCES float_pool_cross_department_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE float_pool_cross_department_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Float Pool & Cross-Department Staff Allocation": Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Coverage gain | Reduction in unmet required hours if the person is assigned. Direct measure of value of each assignment. | Leakage risk to design against: Use the shortage list at solve time. |
| A signal-versus-noise trap in this use case: Eligibility | The true signal is competency and licensure verified for the unit at the shift date; the common noise is matching on job title. | A nurse with the right title may lack the unit competency. |

**Ask the experts**

- [ ] What exactly does "Hard constraints cover licensure, competency, rest periods, maximum hours and collective-agreement rules" mean in practice for float pool & cross-department staff allocation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Coverage gain" and "Continuity score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Coverage achieved at shift start" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: scoring plans on forecast shortage only, and who can confirm the cut-off times and splits?
- [ ] How often does "No feasible plan" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| OR block time | Reserved operating room time given to surgeons or services. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Reward | The number the system tries to maximise over time. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Distribution shift | A change in the data a model sees compared with training. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
