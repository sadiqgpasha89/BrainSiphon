# Release Deployment Risk Scoring: data and feature specification

> Generated from the blueprint `devtools/release-deployment-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Release Deployment Risk Scoring · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Release Deployment Risk Scoring": Estimate the risk of a deployment from the change, the service and the timing so teams add canaries, approvals or delay when risk is high, without blocking safe changes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Author scoring.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Change size and files | size and spread of the change | Risk | From the diff |   |   |   |
| Service criticality and traffic | tier and request rate | Impact | From the catalogue |   |   |   |
| Recent incident history | incidents in the service | Fragility | From the incident tracker |   |   |   |
| Time and freeze state | time of day and freeze windows | Context | From the calendar |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Deployments followed by a rollback, incident or hotfix | Reverts only | Many failures are fixed forward |
| Use | Gate choice and rollout speed | A blame score | Teams own the outcome |
| Fairness | Features about the change and service | Features about the author | Author scores are unfair |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Author name | personal data |
| Team name | weak link |
| Branch name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Change size and files inputs | Developer experience | Source control and code review platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the diff. |
| Service criticality and traffic inputs | Platform engineering | CI/CD and artifact registry | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the catalogue. |
| Recent incident history inputs | Application security | Issue tracker and developer portal | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the incident tracker. |
| Time and freeze state inputs | Developer experience | Source control and code review platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the calendar. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: release_deployment_risk_scoring_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: change_size_and_files, type: double, nullable: false }
    - { name: service_criticality_and_traffic, type: double, nullable: false }
    - { name: recent_incident_history, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Change size and files and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Service criticality and traffic against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Change size and files, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE release_deployment_risk_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  change_size_and_files              DOUBLE PRECISION,
  service_criticality_and_traffic    DOUBLE PRECISION,
  recent_incident_history            DOUBLE PRECISION,
  time_and_freeze_state              DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE release_deployment_risk_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE release_deployment_risk_labels (
  decision_id    UUID        NOT NULL REFERENCES release_deployment_risk_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Release Deployment Risk Scoring": Estimate the risk of a deployment from the change, the service and the timing so teams add canaries, approvals or delay when risk is high, without blocking safe changes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Deployments carry risk that can be staged | Canaries, progressive rollouts and feature flags limit the damage of a bad release. The risk depends on change size, service criticality and timing. | Gating decisions should be policy with model input and not a model alone. |
| Pipelines fail for many reasons | A broken build can come from code, dependencies, infrastructure or configuration. Finding the first real error in a long log, and linking it to recent changes, cuts the time to fix. | A diagnosis that does not show its evidence is hard to trust. |
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Change size and files | Size and spread of the change. Risk. | Leakage risk to design against: From the diff. |
| A signal-versus-noise trap in this use case: Label | The true signal is deployments followed by a rollback, incident or hotfix; the common noise is reverts only. | Many failures are fixed forward. |

**Ask the experts**

- [ ] What exactly does "Risk shown with the drivers" mean in practice for release deployment risk scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Change size and files" and "Service criticality and traffic", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Change failure rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: author scoring, and who can confirm the cut-off times and splits?
- [ ] How often does "New service" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Rollback | Returning to a previous version. |
| Change failure rate | The share of deployments that cause a failure. |
| CD | Continuous delivery or deployment: releasing changes automatically. |
| Canary release | Releasing a change to a small share of users first. |
| Pull request | A proposed code change submitted for review. |
| Code review | Examination of a change by another engineer. |
| Monorepo | One repository holding many projects. |
| Test selection | Choosing which tests to run for a change. |
| Feature flag | A switch that turns a feature on or off without redeploying. |
| Developer portal | A site that gives engineers access to services, docs and templates. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| F1 score | The harmonic mean of precision and recall. |
