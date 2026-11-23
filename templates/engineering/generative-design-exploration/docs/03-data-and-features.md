# Generative Design Exploration: data and feature specification

> Generated from the blueprint `engineering/generative-design-exploration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Generative Design Exploration · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Generative Design Exploration": Generate and rank design options against stated loads, materials, cost and manufacturing limits so engineers explore more alternatives, then verify and choose with their own analysis. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A single metric.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Load cases | forces, moments and conditions | Core | From the design brief |   |   |   |
| Material properties | strength and stiffness | Core | From the materials database |   |   |   |
| Manufacturing constraints | process and tolerance limits | Constraint | From standards |   |   |   |
| Cost model | material and process cost | Objective | From cost data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | Weight, cost and safety factor within limits | A single metric | One metric can hide failure modes |
| Constraint | Hard code and manufacturing limits | Soft preferences | Limits cannot be traded |
| Role | Option generator | The designer | Responsibility stays with the engineer of record |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Designer name | personal data |
| File name | weak link |
| Colour scheme | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Load cases inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the design brief. |
| Material properties inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the materials database. |
| Manufacturing constraints inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from standards. |
| Cost model inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from cost data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: generative_design_exploration_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: load_cases, type: double, nullable: false }
    - { name: material_properties, type: double, nullable: false }
    - { name: manufacturing_constraints, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Load cases and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Material properties against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Load cases, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DataCo Smart Supply Chain | https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis | See the dataset page; free Kaggle login | 180K order lines with shipping modes, delivery status, late-delivery risk and customers | Synthetic-looking and single company; use for pipeline work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KDD Cup 2012 Track 2: ad click prediction | https://www.kaggle.com/c/kddcup2012-track2 | Competition rules; free Kaggle login | Search-ad impressions with query, ad, user and position fields | Old and anonymised, but it records the display position. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE generative_design_exploration_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE generative_design_exploration_outputs (
  run_id TEXT NOT NULL REFERENCES generative_design_exploration_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE generative_design_exploration_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE generative_design_exploration_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Generative Design Exploration": Generate and rank design options against stated loads, materials, cost and manufacturing limits so engineers explore more alternatives, then verify and choose with their own analysis. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Drawings and models carry the design information | Information sits in CAD drawings, PDFs and BIM models, often in different revisions and disciplines. Reading it reliably is a prerequisite for most automation. | Using the wrong revision is a common and costly error. |
| Clashes between disciplines are common | Structure, services and architecture are modelled by different teams, and their elements collide. Not every clash needs action, and the important ones sit among thousands of minor ones. | Prioritising by impact and construction timing makes coordination meetings useful. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Load cases | Forces, moments and conditions. Core. | Leakage risk to design against: From the design brief. |
| A signal-versus-noise trap in this use case: Objective | The true signal is weight, cost and safety factor within limits; the common noise is a single metric. | One metric can hide failure modes. |

**Ask the experts**

- [ ] What exactly does "Options meet every stated constraint before ranking" mean in practice for generative design exploration: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Load cases" and "Material properties", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Design iteration time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: a single metric, and who can confirm the cut-off times and splits?
- [ ] How often does "Unrealistic geometry" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Generative design | Using algorithms to propose design options. |
| Engineer of record | The licensed engineer responsible for a design. |
| Finite element analysis | A numerical method for stress and heat analysis. |
| CAD | Computer-aided design software for drawings and models. |
| RFI | Request for information: a question sent to the design team during construction. |
| Change order | A formal change to scope, cost or time. |
| Claim | A request for extra time or money under a contract. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Regret | The reward lost by not always choosing the best action. |
| Exploration / exploitation | Trying new actions to learn versus using the best known one. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
