# API Breaking Change Detection: data and feature specification

> Generated from the blueprint `devtools/api-breaking-change-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** API Breaking Change Detection · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "API Breaking Change Detection": Detect changes in API schemas and behaviour that would break consumers and warn authors in the pull request with the list of affected clients. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Textual diffs only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Schema diff classification | removed, renamed or type-changed fields | Core | From schema tools |   |   |   |
| Consumer usage | clients calling the changed field | Impact | From traces |   |   |   |
| Version and deprecation state | planned deprecation | Context | From the registry |   |   |   |
| Contract test results | consumer contract checks | Evidence | From CI |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Rule | Contract compatibility rules | Textual diffs | Text diffs miss semantic breaks |
| Impact | Real consumers from traffic | All possible clients | Unused fields can change safely |
| Control | A review gate with exceptions | An automatic block with no exception | Planned breaks need a path |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Author name | personal data |
| Branch name | an artefact |
| File path | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Schema diff classification inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from schema tools. |
| Consumer usage inputs | Platform engineering | CI/CD and artifact registry | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from traces. |
| Version and deprecation state inputs | Application security | Issue tracker and developer portal | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the registry. |
| Contract test results inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from CI. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: api_breaking_change_detection_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: schema_diff_classification, type: double, nullable: false }
    - { name: consumer_usage, type: double, nullable: false }
    - { name: version_and_deprecation_state, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Schema diff classification and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Consumer usage against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Schema diff classification, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| TalkingData AdTracking Fraud Detection | https://www.kaggle.com/c/talkingdata-adtracking-fraud-detection | Competition rules; free Kaggle login | 200 million mobile ad clicks with an app-download label to detect click fraud | Anonymised and from one platform. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE api_breaking_change_detection_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE api_breaking_change_detection_outputs (
  run_id TEXT NOT NULL REFERENCES api_breaking_change_detection_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE api_breaking_change_detection_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE api_breaking_change_detection_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "API Breaking Change Detection": Detect changes in API schemas and behaviour that would break consumers and warn authors in the pull request with the list of affected clients. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Deployments carry risk that can be staged | Canaries, progressive rollouts and feature flags limit the damage of a bad release. The risk depends on change size, service criticality and timing. | Gating decisions should be policy with model input and not a model alone. |
| Tests are slow, flaky and unevenly useful | Large suites take hours and some tests fail without a code cause. Selecting and ordering tests by their chance of catching a regression saves time, but only if flaky tests are separated from real failures. | Skipping tests to save time moves risk to production. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Schema diff classification | Removed, renamed or type-changed fields. Core. | Leakage risk to design against: From schema tools. |
| A signal-versus-noise trap in this use case: Rule | The true signal is contract compatibility rules; the common noise is textual diffs. | Text diffs miss semantic breaks. |

**Ask the experts**

- [ ] What exactly does "Breaking changes flagged in the pull request" mean in practice for api breaking change detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Schema diff classification" and "Consumer usage", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Breaking changes reaching production" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: textual diffs only, and who can confirm the cut-off times and splits?
- [ ] How often does "Behavioural change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pull request | A proposed code change submitted for review. |
| Code review | Examination of a change by another engineer. |
| Commit | A saved change to the code base. |
| Test selection | Choosing which tests to run for a change. |
| Regression | A defect introduced by a change to previously working behaviour. |
| Change failure rate | The share of deployments that cause a failure. |
| CI | Continuous integration: building and testing every change automatically. |
| Test coverage | The share of code run by tests. |
| Canary release | Releasing a change to a small share of users first. |
| Lead time | The time from commit to production. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Personalised PageRank | PageRank that restarts from chosen seed nodes, used to spread risk from known bad nodes. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
