# Code Ownership Inference: data and feature specification

> Generated from the blueprint `devtools/code-ownership-inference` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Code Ownership Inference · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Code Ownership Inference": Infer likely owners for unowned code and services from contribution history, on-call data and reviews so ownership files are complete, for team leads to confirm. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual owners.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Recent commit share by team | recent change contributions | Core | From version control |   |   |   |
| Review and incident participation | who reviews and responds | Support | From tools |   |   |   |
| On-call mapping | services on call rotations | Strong evidence | From the pager |   |   |   |
| Team membership | current teams | Constraint | From HR directory |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Level | Teams | Individuals | People change roles and leave |
| Evidence | Recent contributions, reviews and on-call | Authorship only | Original authors may have left |
| Control | Lead confirmation | Automatic assignment | Ownership has accountability |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Developer name alone | personal data |
| File age | weak link |
| Commit message | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Recent commit share by team inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from version control. |
| Review and incident participation inputs | Platform engineering | CI/CD and artifact registry | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from tools. |
| On-call mapping inputs | Application security | Issue tracker and developer portal | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the pager. |
| Team membership inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from HR directory. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: code_ownership_inference_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: recent_commit_share_by_team, type: double, nullable: false }
    - { name: review_and_incident_participation, type: double, nullable: false }
    - { name: on_call_mapping, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Recent commit share by team and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Review and incident participation against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Recent commit share by team, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE code_ownership_inference_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE code_ownership_inference_outputs (
  run_id TEXT NOT NULL REFERENCES code_ownership_inference_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE code_ownership_inference_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE code_ownership_inference_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Code Ownership Inference": Infer likely owners for unowned code and services from contribution history, on-call data and reviews so ownership files are complete, for team leads to confirm. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Developer productivity is a team-level concept | Flow metrics such as lead time and deployment frequency describe a system. Used on individuals, they are gamed and harm trust. | Any measurement should be aggregated to teams and agreed with employee representatives where required. |
| Deployments carry risk that can be staged | Canaries, progressive rollouts and feature flags limit the damage of a bad release. The risk depends on change size, service criticality and timing. | Gating decisions should be policy with model input and not a model alone. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Recent commit share by team | Recent change contributions. Core. | Leakage risk to design against: From version control. |
| A signal-versus-noise trap in this use case: Level | The true signal is teams; the common noise is individuals. | People change roles and leave. |

**Ask the experts**

- [ ] What exactly does "Suggestions confirmed by team leads" mean in practice for code ownership inference: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Recent commit share by team" and "Review and incident participation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Paths with owners" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: individual owners, and who can confirm the cut-off times and splits?
- [ ] How often does "Reorganisation" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pull request | A proposed code change submitted for review. |
| Commit | A saved change to the code base. |
| Code owner | The team responsible for part of the code. |
| Code review | Examination of a change by another engineer. |
| Test coverage | The share of code run by tests. |
| Lead time | The time from commit to production. |
| Reachability | Whether vulnerable code can actually be called. |
| Service catalogue | A list of services with owners and dependencies. |
| Monorepo | One repository holding many projects. |
| Change failure rate | The share of deployments that cause a failure. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
