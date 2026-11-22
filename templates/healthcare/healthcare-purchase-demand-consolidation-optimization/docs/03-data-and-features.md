# Healthcare Purchase Demand Consolidation Optimization: data and feature specification

> Generated from the blueprint `healthcare/healthcare-purchase-demand-consolidation-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Purchase Demand Consolidation Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Purchase Demand Consolidation Optimization": Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising price while ignoring holding cost.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Forecast demand with uncertainty | expected demand and variance per item and facility | The basis of the plan | Forecast snapshot at planning time |   |   |   |
| Tier proximity | distance to the next price tier | Value of consolidation | Contract terms |   |   |   |
| Lead-time variability | variance of supplier lead time | Sets buffer | Receipts history |   |   |   |
| Expiry risk | shelf life remaining against forecast consumption | Prevents waste | Lot data as at planning |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | Total cost with tier savings, holding, ordering and stockout | Unit price alone | Cheap bulk buys create expiry and holding cost |
| Safety | Safety stock for critical items as hard constraints | Cost-minimal stock | A stockout of a critical supply harms patients |
| Network | Multi-echelon view across central and local stores | Facility-by-facility planning | Local optima fragment demand |
| Contract | Tier thresholds and minimums as constraints | Ignoring contract structure | Missing a tier forfeits savings |
| Forecast | Forecast uncertainty reflected in safety stock | Point forecast | Demand uncertainty drives buffer needs |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Buyer preference for a supplier | habit |
| Facility size alone | not demand |
| Past order timing | reflects past fragmentation |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Forecast demand with uncertainty inputs | Materials management | Inventory and materials management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: forecast snapshot at planning time. |
| Tier proximity inputs | Procurement | Procurement system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract terms. |
| Lead-time variability inputs | Supply chain logistics | Contract repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: receipts history. |
| Expiry risk inputs | Finance | Demand forecasting service | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: lot data as at planning. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_purchase_demand_inputs.v1
owner: materials-management@example.com
system_of_record: Inventory and materials management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: forecast_demand_with_uncertainty, type: double, nullable: false }
    - { name: tier_proximity, type: double, nullable: false }
    - { name: lead_time_variability, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Forecast demand with uncertainty and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Tier proximity against Inventory and materials management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Forecast demand with uncertainty, traces back to Inventory and materials management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE healthcare_purchase_demand_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE healthcare_purchase_demand_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES healthcare_purchase_demand_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE healthcare_purchase_demand_assignments (
  plan_id TEXT NOT NULL REFERENCES healthcare_purchase_demand_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE healthcare_purchase_demand_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Purchase Demand Consolidation Optimization": Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Forecast demand with uncertainty | Expected demand and variance per item and facility. The basis of the plan. | Leakage risk to design against: Forecast snapshot at planning time. |
| A signal-versus-noise trap in this use case: Objective | The true signal is total cost with tier savings, holding, ordering and stockout; the common noise is unit price alone. | Cheap bulk buys create expiry and holding cost. |

**Ask the experts**

- [ ] What exactly does "Buyers approve orders and critical supplies keep safety-stock constraints" mean in practice for healthcare purchase demand consolidation optimization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Forecast demand with uncertainty" and "Tier proximity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Tier savings achieved" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising price while ignoring holding cost, and who can confirm the cut-off times and splits?
- [ ] How often does "Supplier minimum cannot be met" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
