# Safety-Critical AI Validation: data and feature specification

> Generated from the blueprint `engineering/safety-critical-ai-validation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Safety-Critical AI Validation · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Safety-Critical AI Validation": Validate AI models used near safety-critical engineering decisions with independent test sets, failure analysis and operating limits so only models with documented evidence are released for use. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training metrics as evidence.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Held-out performance by condition | accuracy across conditions | Core | From validation |   |   |   |
| Failure case catalogue | known failure modes | Core | From analysis |   |   |   |
| Operating domain coverage | conditions tested | Limit | From test design |   |   |   |
| Monitoring drift | live data versus validation data | Alert | From monitoring |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Evidence | Independent held-out and field data | Training performance | Training metrics overstate reality |
| Scope | Documented operating domain | Any use | Models fail outside their domain |
| Control | Safety officer sign-off | Self-release by developers | Developers miss their own risks |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Developer name | personal data |
| Model architecture | not evidence |
| Training run id | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Held-out performance by condition inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from validation. |
| Failure case catalogue inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from analysis. |
| Operating domain coverage inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from test design. |
| Monitoring drift inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from monitoring. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: safety_critical_ai_validation_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: held_out_performance_by_condition, type: double, nullable: false }
    - { name: failure_case_catalogue, type: double, nullable: false }
    - { name: operating_domain_coverage, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Held-out performance by condition and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Failure case catalogue against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Held-out performance by condition, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE safety_critical_ai_validation_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE safety_critical_ai_validation_detections (
  frame_id TEXT NOT NULL REFERENCES safety_critical_ai_validation_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE safety_critical_ai_validation_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Safety-Critical AI Validation": Validate AI models used near safety-critical engineering decisions with independent test sets, failure analysis and operating limits so only models with documented evidence are released for use. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Site safety is about conditions | Hazards such as open edges, exclusion zones and plant movement can be detected at scene level. Monitoring individual workers raises legal and trust issues. | Safety tools support inspections and do not replace them. |
| Schedules slip for reasons that can be seen early | Delay comes from late design, supply, weather, access and productivity. Progress reports are often optimistic, so forecasts should use durations, float and risk drivers. | A single completion date presented as certain misleads decisions. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Held-out performance by condition | Accuracy across conditions. Core. | Leakage risk to design against: From validation. |
| A signal-versus-noise trap in this use case: Evidence | The true signal is independent held-out and field data; the common noise is training performance. | Training metrics overstate reality. |

**Ask the experts**

- [ ] What exactly does "Independent test data never used in training" mean in practice for safety-critical ai validation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Held-out performance by condition" and "Failure case catalogue", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Models released without evidence" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training metrics as evidence, and who can confirm the cut-off times and splits?
- [ ] How often does "Rare conditions" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Health and safety plan | A plan for managing risk on a project. |
| Engineer of record | The licensed engineer responsible for a design. |
| Drawing revision | A numbered version of a drawing. |
| Change order | A formal change to scope, cost or time. |
| Variation | A change to the work required by the client. |
| Critical path | The chain of activities that sets the project end date. |
| Work package | A defined portion of the project work. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Shortcut learning | A model using an easy but irrelevant cue that happens to correlate with the label. |
| OCR / text detection | Finding and reading text in images. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
