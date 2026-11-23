# Flaky Test Detection and Quarantine: data and feature specification

> Generated from the blueprint `devtools/ci-flaky-test-quarantine` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Flaky Test Detection and Quarantine · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Flaky Test Detection and Quarantine": Identify tests that fail intermittently, estimate their cost and quarantine or fix them so CI results are trusted and engineers stop re-running pipelines. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Silent skips.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pass-fail flip rate on same commit | outcome changes without code change | Core | From CI |   |   |   |
| Time and resource correlation | failures with load or time | Cause | From CI |   |   |   |
| Test age and dependencies | external services and timing use | Cause | From analysis |   |   |   |
| Rerun outcomes | pass after retry | Evidence | From CI |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Tests that pass and fail on the same code | Failures after changes | Those are real failures |
| Action | Owner ticket with a deadline | Silent skip | Silent skips hide risk |
| Cost | Developer time lost to flakes | Failure counts | Cost sets priority |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Developer name | personal data |
| Test name wording | weak link |
| Branch name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pass-fail flip rate on same commit inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from CI. |
| Time and resource correlation inputs | Platform engineering | CI/CD and artifact registry | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from CI. |
| Test age and dependencies inputs | Application security | Issue tracker and developer portal | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from analysis. |
| Rerun outcomes inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from CI. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ci_flaky_test_quarantine_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pass_fail_flip_rate_on_same_commit, type: double, nullable: false }
    - { name: time_and_resource_correlation, type: double, nullable: false }
    - { name: test_age_and_dependencies, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Pass-fail flip rate on same commit and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Time and resource correlation against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pass-fail flip rate on same commit, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE ci_flaky_test_quarantine_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE ci_flaky_test_quarantine_outputs (
  run_id TEXT NOT NULL REFERENCES ci_flaky_test_quarantine_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE ci_flaky_test_quarantine_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE ci_flaky_test_quarantine_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Flaky Test Detection and Quarantine": Identify tests that fail intermittently, estimate their cost and quarantine or fix them so CI results are trusted and engineers stop re-running pipelines. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Tests are slow, flaky and unevenly useful | Large suites take hours and some tests fail without a code cause. Selecting and ordering tests by their chance of catching a regression saves time, but only if flaky tests are separated from real failures. | Skipping tests to save time moves risk to production. |
| Pipelines fail for many reasons | A broken build can come from code, dependencies, infrastructure or configuration. Finding the first real error in a long log, and linking it to recent changes, cuts the time to fix. | A diagnosis that does not show its evidence is hard to trust. |
| Deployments carry risk that can be staged | Canaries, progressive rollouts and feature flags limit the damage of a bad release. The risk depends on change size, service criticality and timing. | Gating decisions should be policy with model input and not a model alone. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Pass-fail flip rate on same commit | Outcome changes without code change. Core. | Leakage risk to design against: From CI. |
| A signal-versus-noise trap in this use case: Label | The true signal is tests that pass and fail on the same code; the common noise is failures after changes. | Those are real failures. |

**Ask the experts**

- [ ] What exactly does "Flaky classification with evidence from reruns" mean in practice for flaky test detection and quarantine: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pass-fail flip rate on same commit" and "Time and resource correlation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Reruns per pipeline" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: silent skips, and who can confirm the cut-off times and splits?
- [ ] How often does "Infrastructure outage" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Flaky test | A test that sometimes fails without a code change. |
| CI | Continuous integration: building and testing every change automatically. |
| Commit | A saved change to the code base. |
| Regression | A defect introduced by a change to previously working behaviour. |
| Test coverage | The share of code run by tests. |
| Test selection | Choosing which tests to run for a change. |
| Change failure rate | The share of deployments that cause a failure. |
| Code review | Examination of a change by another engineer. |
| Mutation testing | Testing the tests by injecting small faults. |
| Lead time | The time from commit to production. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
