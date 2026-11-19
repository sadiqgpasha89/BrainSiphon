# Predictive Test Selection: data and feature specification

> Generated from the blueprint `saas/predictive-test-selection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Test Selection · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Predictive Test Selection": Select the subset of tests most likely to fail for a code change, cutting CI time dramatically while catching nearly all regressions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating with selected-only outcomes.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| File-test co-failure history | tests failing when file changed | Link | Window |   |   |   |
| Change size and risk | lines, files, authors | Risk | Metadata |   |   |   |
| Test historical failure rate | prior fail rate | Prior | Matured |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Selection | Learn failure likelihood from change-test history | Run everything or file-path rules | Running all tests doesn't scale |
| Safety | Periodic full runs and risk floors | Trust the model only | Silent coverage drift hides regressions |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Commit message | weak |
| Author | personal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| File-test co-failure history inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: window. |
| Change size and risk inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: metadata. |
| Test historical failure rate inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: matured. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: predictive_test_selection_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: file_test_co_failure_history, type: double, nullable: false }
    - { name: change_size_and_risk, type: double, nullable: false }
    - { name: test_historical_failure_rate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on File-test co-failure history and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Change size and risk against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as File-test co-failure history, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE predictive_test_selection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  file_test_co_failure_history       DOUBLE PRECISION,
  change_size_and_risk               DOUBLE PRECISION,
  test_historical_failure_rate       DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE predictive_test_selection_decisions (
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
CREATE TABLE predictive_test_selection_labels (
  decision_id    UUID        NOT NULL REFERENCES predictive_test_selection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Predictive Test Selection": Select the subset of tests most likely to fail for a code change, cutting CI time dramatically while catching nearly all regressions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Engineering productivity and developer tools | Code completion, review, test selection, flaky test detection, deployment risk and pull-request summarisation reduce developer toil. Quality is measured by acceptance, correctness (do the tests pass) and trust; noisy tools get switched off. | Offline benchmarks like pass rates on toy problems do not predict real-world usefulness; measure acceptance and time saved in real repositories. |
| Reliability engineering and AIOps | Operations teams run services against reliability targets (SLOs). Monitoring produces metrics, logs and traces; models detect anomalies, forecast capacity, correlate alerts, find root causes and sample traces. Incidents are rare, labels are scarce and systems change constantly. | Alert noise and unexplained pages burn out on-call engineers, so precision, grouping and actionable context come first. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: File-test co-failure history | Tests failing when file changed. Link. | Leakage risk to design against: Window. |
| A signal-versus-noise trap in this use case: Selection | The true signal is learn failure likelihood from change-test history; the common noise is run everything or file-path rules. | Running all tests doesn't scale. |

**Ask the experts**

- [ ] What exactly does "Catch 99%+ of failures" mean in practice for predictive test selection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "File-test co-failure history" and "Change size and risk", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Escaped regressions" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating with selected-only outcomes, and who can confirm the cut-off times and splits?
- [ ] How often does "New test with no history" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Flaky test | A test that sometimes passes and sometimes fails without any code change. |
| Feature flag | A switch that turns a feature on for chosen users, used for gradual rollouts and experiments. |
| Auth scope / OAuth | A permission granted to a token, and the standard protocol for delegated access. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Pipeline | The set of open sales opportunities and their stages and expected values. |
| Sequential testing | Statistical methods that allow results to be checked repeatedly without inflating false positives. |
| Pull request (PR) | A proposed code change submitted for review before merging. |
| CI/CD | Continuous integration and delivery: automated building, testing and deployment of code. |
| SLO / SLA | A service level objective (internal target) and agreement (promised to customers) for reliability. |
| Observability | The ability to understand a system's state from its metrics, logs and traces. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
