# Team Flow Metrics and Insights: data and feature specification

> Generated from the blueprint `devtools/team-flow-metrics-dashboard` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Team Flow Metrics and Insights · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Team Flow Metrics and Insights": Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual metrics.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lead time for changes | time from commit to production | Flow | From CI and CD |   |   |   |
| Deployment frequency | deployments per period | Flow | From CD |   |   |   |
| Change failure rate | share of deployments with failures | Stability | From incidents |   |   |   |
| Time to restore | time to fix a failure | Resilience | From incidents |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Level | Teams with at least 5 people | Individuals | Individual metrics are gamed and harm trust |
| Use | Team improvement conversations | Performance reviews | Metrics are not performance ratings |
| Interpretation | Trends with context | Targets | Targets are gamed |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Developer name | personal data |
| Lines of code | a poor proxy |
| Commit counts | a poor proxy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lead time for changes inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from CI and CD. |
| Deployment frequency inputs | Platform engineering | CI/CD and artifact registry | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from CD. |
| Change failure rate inputs | Application security | Issue tracker and developer portal | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from incidents. |
| Time to restore inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from incidents. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: team_flow_metrics_dashboard_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lead_time_for_changes, type: double, nullable: false }
    - { name: deployment_frequency, type: double, nullable: false }
    - { name: change_failure_rate, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Lead time for changes and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Deployment frequency against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lead time for changes, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Server Machine Dataset (OmniAnomaly) | https://github.com/NetManAIOps/OmniAnomaly | MIT licence (see the repository) | Multivariate server metrics from an internet company with labelled anomalies | One company; coarse labels. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE team_flow_metrics_dashboard_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE team_flow_metrics_dashboard_outputs (
  run_id TEXT NOT NULL REFERENCES team_flow_metrics_dashboard_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE team_flow_metrics_dashboard_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE team_flow_metrics_dashboard_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Team Flow Metrics and Insights": Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Developer productivity is a team-level concept | Flow metrics such as lead time and deployment frequency describe a system. Used on individuals, they are gamed and harm trust. | Any measurement should be aggregated to teams and agreed with employee representatives where required. |
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Pipelines fail for many reasons | A broken build can come from code, dependencies, infrastructure or configuration. Finding the first real error in a long log, and linking it to recent changes, cuts the time to fix. | A diagnosis that does not show its evidence is hard to trust. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Lead time for changes | Time from commit to production. Flow. | Leakage risk to design against: From CI and CD. |
| A signal-versus-noise trap in this use case: Level | The true signal is teams with at least 5 people; the common noise is individuals. | Individual metrics are gamed and harm trust. |

**Ask the experts**

- [ ] What exactly does "Metrics at team level with a minimum group size" mean in practice for team flow metrics and insights: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Lead time for changes" and "Deployment frequency", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Lead time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: individual metrics, and who can confirm the cut-off times and splits?
- [ ] How often does "Small team" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Lead time | The time from commit to production. |
| Change failure rate | The share of deployments that cause a failure. |
| Code review | Examination of a change by another engineer. |
| CD | Continuous delivery or deployment: releasing changes automatically. |
| Pull request | A proposed code change submitted for review. |
| Commit | A saved change to the code base. |
| DORA metrics | Four measures of delivery performance: lead time, deployment frequency, change failure rate and time to restore. |
| Code owner | The team responsible for part of the code. |
| Cycle time | The time from starting work to finishing. |
| CI | Continuous integration: building and testing every change automatically. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Stationarity | A series whose statistical properties do not change over time. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
