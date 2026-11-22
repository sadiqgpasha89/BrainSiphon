# Healthcare Workforce Skill-Mix Optimization: data and feature specification

> Generated from the blueprint `healthcare/healthcare-workforce-skill-mix-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Skill-Mix Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Workforce Skill-Mix Optimization": Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring against forecast acuity only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Skill coverage per shift | required competency count present vs required | Core safety measure | Competencies valid on the shift date |   |   |   |
| Experience balance | share of staff within each experience band per shift | Balances risk and learning | Banding from HR records as of the date |   |   |   |
| Supervision capacity | preceptor slots available per shift | Limits how many novices can be rostered | Use rules as published |   |   |   |
| Acuity-driven mix target | target competencies as a function of forecast acuity | Links mix to workload | Use the forecast snapshot at solve time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Skills | Verified competency records with effective dates | Job title as a proxy for skill | Titles hide missing competencies |
| Proof | Constraint proof per shift | An overall score | A leader needs to see why a roster is safe |
| Supervision | Preceptor and supervision rules as hard constraints | Soft penalties | A new graduate cannot be treated as acceptable without supervision |
| Trade-offs | Explicit view of the cost of each relaxed preference | Hidden weighting | Staff reject rosters built on opaque trade-offs |
| Forecast link | Skill mix targets derived from the acuity forecast | Fixed ratios per unit | Mix needs change with acuity |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Years of service alone | does not equal competence in the unit |
| Informal reputation | unfair and unverifiable |
| Preference ranking by managers | not a safe objective |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Skill coverage per shift inputs | Nursing operations | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: competencies valid on the shift date. |
| Experience balance inputs | Clinical education | Credentialing and competency records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: banding from HR records as of the date. |
| Supervision capacity inputs | Credentialing office | Staffing policy and supervision rules | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use rules as published. |
| Acuity-driven mix target inputs | Nursing operations | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the forecast snapshot at solve time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_workforce_skill_mix_inputs.v1
owner: nursing-operations@example.com
system_of_record: Workforce management and scheduling system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: skill_coverage_per_shift, type: double, nullable: false }
    - { name: experience_balance, type: double, nullable: false }
    - { name: supervision_capacity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Skill coverage per shift and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Experience balance against Workforce management and scheduling system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Skill coverage per shift, traces back to Workforce management and scheduling system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE healthcare_workforce_skill_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE healthcare_workforce_skill_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES healthcare_workforce_skill_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE healthcare_workforce_skill_assignments (
  plan_id TEXT NOT NULL REFERENCES healthcare_workforce_skill_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE healthcare_workforce_skill_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Workforce Skill-Mix Optimization": Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Skill coverage per shift | Required competency count present vs required. Core safety measure. | Leakage risk to design against: Competencies valid on the shift date. |
| A signal-versus-noise trap in this use case: Skills | The true signal is verified competency records with effective dates; the common noise is job title as a proxy for skill. | Titles hide missing competencies. |

**Ask the experts**

- [ ] What exactly does "Hard constraints cover licensure, competency, supervision ratios, rest and policy mix rules" mean in practice for healthcare workforce skill-mix optimization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Skill coverage per shift" and "Experience balance", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Shifts meeting required mix at start" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: scoring against forecast acuity only, and who can confirm the cut-off times and splits?
- [ ] How often does "Competency record missing" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Distribution shift | A change in the data a model sees compared with training. |
| p99 latency | The time within which 99% of requests complete. |
