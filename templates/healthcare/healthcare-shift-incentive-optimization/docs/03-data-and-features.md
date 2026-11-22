# Healthcare Shift Incentive Optimization: data and feature specification

> Generated from the blueprint `healthcare/healthcare-shift-incentive-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Shift Incentive Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Shift Incentive Optimization": Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating raw acceptance as incentive effect.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Urgency | hours to shift start and unmet required hours | Fill difficulty rises as notice shortens | Use time of the offer |   |   |   |
| Historical response by shift type | acceptance by role, shift and notice band | Describes how responsive the pool is | Strictly past offers |   |   |   |
| Marginal fill probability | estimated change in fill probability per incentive step | The quantity the decision needs | Estimate only from randomised or propensity-weighted data |   |   |   |
| Pool depth | eligible staff not yet scheduled or at hours cap | Fill is limited by who is available | Eligibility as of offer time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Effect | Uplift of the incentive on fill probability | Raw fill rate of shifts that received an incentive | Shifts that get incentives are the hardest ones and look worse |
| Policy | Approved incentive menu and caps as hard constraints | A learned optimum with no limits | The best incentive may be one policy forbids |
| Fairness | Equal treatment of comparable shifts across groups and units | Targeting the people most likely to accept | Different pay for similar work is a fairness and legal risk |
| Experiments | Randomised exploration within a capped budget | Learning only from logged offers | Logged offers are selected by managers and bias the estimate |
| Alternatives | Compare incentive with float, cross-training and agency | Incentive in isolation | The cheapest fill may not be an incentive at all |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Employee personal characteristics | unfair targeting and no causal signal |
| Raw acceptance rate | confounded by which shifts get which offers |
| Manager identity | proxies for habit rather than effect |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Urgency inputs | Workforce management office | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use time of the offer. |
| Historical response by shift type inputs | HR compensation | Pay-rule and incentive policy register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: strictly past offers. |
| Marginal fill probability inputs | Finance | Labour budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: estimate only from randomised or propensity-weighted data. |
| Pool depth inputs | Labour relations | Open-shift marketplace | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: eligibility as of offer time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_shift_incentive_optimization_inputs.v1
owner: workforce-management-office@example.com
system_of_record: Workforce management and scheduling system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: urgency, type: double, nullable: false }
    - { name: historical_response_by_shift_type, type: double, nullable: false }
    - { name: marginal_fill_probability, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Urgency and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Historical response by shift type against Workforce management and scheduling system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Urgency, traces back to Workforce management and scheduling system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
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
CREATE TABLE healthcare_shift_incentive_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE healthcare_shift_incentive_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES healthcare_shift_incentive_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE healthcare_shift_incentive_assignments (
  plan_id TEXT NOT NULL REFERENCES healthcare_shift_incentive_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE healthcare_shift_incentive_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Shift Incentive Optimization": Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Urgency | Hours to shift start and unmet required hours. Fill difficulty rises as notice shortens. | Leakage risk to design against: Use time of the offer. |
| A signal-versus-noise trap in this use case: Effect | The true signal is uplift of the incentive on fill probability; the common noise is raw fill rate of shifts that received an incentive. | Shifts that get incentives are the hardest ones and look worse. |

**Ask the experts**

- [ ] What exactly does "Offers only from the approved incentive menu and within caps" mean in practice for healthcare shift incentive optimization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Urgency" and "Historical response by shift type", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fill rate of hard-to-staff shifts" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating raw acceptance as incentive effect, and who can confirm the cut-off times and splits?
- [ ] How often does "Budget exhausted mid-period" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| OR block time | Reserved operating room time given to surgeons or services. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Policy | The rule that maps a situation to an action. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Distribution shift | A change in the data a model sees compared with training. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Markov decision process | A mathematical model of sequential decisions with states, actions, rewards and transitions. |
