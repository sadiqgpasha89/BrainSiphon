# Clinical Communication Workload Optimization: data and feature specification

> Generated from the blueprint `healthcare/clinical-communication-workload-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Communication Workload Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Clinical Communication Workload Optimization": Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising volume while ignoring urgent categories.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Duplicate cluster size | messages in a cluster of near-identical content to the same group | Shows avoidable load | Message text and metadata |   |   |   |
| Acknowledgement rate by category | share of messages acknowledged and acted on | Low value messages stand out | Earlier periods |   |   |   |
| Team workload | messages per staff member per shift | Overload measure | Roster and message data |   |   |   |
| Policy category | policy class of each notification | Applies the exclusions | Policy register |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Exclusions | Urgent and safety-critical categories protected | All messages eligible | Reduction must not touch critical alerts |
| Evidence | Volume removed and categories touched shown | Percent reduction only | Governance needs to see what changes |
| Duplicates | Clusters of near-identical messages | Exact match only | Duplicates vary in wording |
| Authority | Governance approves rules | Automatic suppression | Suppression is a safety decision |
| Forecast | Workload by team and period | Average load | Overload is a peak problem |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Message length | not value |
| Sender identity | not a value factor |
| Time of day alone | confounded |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Duplicate cluster size inputs | Clinical operations | Secure messaging platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: message text and metadata. |
| Acknowledgement rate by category inputs | Nursing leadership | Alert and notification policy register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: earlier periods. |
| Team workload inputs | Clinical informatics | Routing and roster records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: roster and message data. |
| Policy category inputs | Patient safety | Workload and census data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: policy register. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: clinical_communication_workload_inputs.v1
owner: clinical-operations@example.com
system_of_record: Secure messaging platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: duplicate_cluster_size, type: double, nullable: false }
    - { name: acknowledgement_rate_by_category, type: double, nullable: false }
    - { name: team_workload, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Duplicate cluster size and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Acknowledgement rate by category against Secure messaging platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Duplicate cluster size, traces back to Secure messaging platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE clinical_communication_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE clinical_communication_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES clinical_communication_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE clinical_communication_assignments (
  plan_id TEXT NOT NULL REFERENCES clinical_communication_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE clinical_communication_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Clinical Communication Workload Optimization": Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Duplicate cluster size | Messages in a cluster of near-identical content to the same group. Shows avoidable load. | Leakage risk to design against: Message text and metadata. |
| A signal-versus-noise trap in this use case: Exclusions | The true signal is urgent and safety-critical categories protected; the common noise is all messages eligible. | Reduction must not touch critical alerts. |

**Ask the experts**

- [ ] What exactly does "Clinically significant alerts are never suppressed without approved rules and a safety validation" mean in practice for clinical communication workload optimization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Duplicate cluster size" and "Acknowledgement rate by category", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Message volume per clinician per shift" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising volume while ignoring urgent categories, and who can confirm the cut-off times and splits?
- [ ] How often does "Duplicate that is a legitimate repeat" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Policy | The rule that maps a situation to an action. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| F1 score | The harmonic mean of precision and recall. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
