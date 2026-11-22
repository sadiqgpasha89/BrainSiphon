# Healthcare Spend Category Optimization: data and feature specification

> Generated from the blueprint `healthcare/healthcare-spend-category-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Spend Category Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Spend Category Optimization": Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting gross savings.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Price dispersion | spread of unit price for equivalent items across facilities | A savings signal | After normalisation |   |   |   |
| Volume concentration | share of spend in few suppliers | Leverage and risk | Spend as at period end |   |   |   |
| Standardisation gap | number of equivalent items used in a category | Complexity and cost | Clinical approvals |   |   |   |
| Switching feasibility | clinical, contractual and inventory barriers | Realisable savings | Contract and approval status |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Equivalence | Clinically approved equivalence as a hard gate | Similarity of descriptions | Similar words do not mean clinical equivalence |
| Savings | Range net of switching cost and risk | Gross price difference | The cheapest item may not be usable |
| Segmentation | Spend segmentation by category, volume and variability | One list of items | Different segments need different strategies |
| Adoption | Utilisation and physician preference considered | Price only | Savings that clinicians reject are not savings |
| Evidence | Confidence ranking of hypotheses | Single estimate | Leaders need to compare certainty |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Price list discounts not applied in practice | inflates savings |
| Brand preference alone | not clinical |
| Supplier relationship tenure | not a savings driver |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Price dispersion inputs | Strategic sourcing | Procurement and accounts-payable system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: after normalisation. |
| Volume concentration inputs | Supply chain finance | Item and service taxonomy | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: spend as at period end. |
| Standardisation gap inputs | Clinical value analysis | Supplier contract repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: clinical approvals. |
| Switching feasibility inputs | Materials management | Clinical value analysis records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract and approval status. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_spend_category_optimization_inputs.v1
owner: strategic-sourcing@example.com
system_of_record: Procurement and accounts-payable system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: price_dispersion, type: double, nullable: false }
    - { name: volume_concentration, type: double, nullable: false }
    - { name: standardisation_gap, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Price dispersion and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Volume concentration against Procurement and accounts-payable system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Price dispersion, traces back to Procurement and accounts-payable system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE healthcare_spend_category_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE healthcare_spend_category_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES healthcare_spend_category_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE healthcare_spend_category_assignments (
  plan_id TEXT NOT NULL REFERENCES healthcare_spend_category_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE healthcare_spend_category_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Spend Category Optimization": Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Medical imaging and diagnostics | Models read radiographs, scans, slides, retinal and skin images. Labels come from radiologist reports, adjudicated reads or biopsy; devices, hospitals and populations differ, and a model's apparent accuracy can come from artefacts such as scanner markings rather than disease. | Evaluation must hold out whole sites or devices and report sensitivity at clinically agreed specificity, with subgroup performance. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Price dispersion | Spread of unit price for equivalent items across facilities. A savings signal. | Leakage risk to design against: After normalisation. |
| A signal-versus-noise trap in this use case: Equivalence | The true signal is clinically approved equivalence as a hard gate; the common noise is similarity of descriptions. | Similar words do not mean clinical equivalence. |

**Ask the experts**

- [ ] What exactly does "Clinical value analysis approves substitutions and standardisation and the model only proposes hypotheses" mean in practice for healthcare spend category optimization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Price dispersion" and "Volume concentration", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Realised savings net of switching cost" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: counting gross savings, and who can confirm the cut-off times and splits?
- [ ] How often does "Taxonomy errors" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Segmentation | Outlining the exact pixels of an organ, tumour or structure in an image. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Discount factor | How much a future reward is worth compared with the same reward now. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
