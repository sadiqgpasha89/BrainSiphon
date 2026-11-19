# Reinsurance Treaty Allocation Optimisation: data and feature specification

> Generated from the blueprint `bfsi/reinsurance-treaty-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Reinsurance Treaty Allocation Optimisation · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Reinsurance Treaty Allocation Optimisation": Choose how risks are ceded across reinsurance treaties to reduce capital and volatility at an acceptable premium. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising against one simulation set.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Loss distribution by line | simulated gross losses | Input | Model risk |   |   |   |
| Treaty terms | attachment, limit, reinstatement | Structure | Complexity |   |   |   |
| Reinsurer credit | rating and spread | Counterparty | Changes |   |   |   |
| Capital relief | solvency capital change | Benefit | Model dependent |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Net result | Net loss distribution after recoveries | Gross loss | Reinsurance changes the tail |
| Credit | Reinsurer default risk | Treating recoveries as certain | Recoveries are credit exposure |
| Basis | Basis risk between loss and trigger | Perfect hedge assumption | Parametric covers can miss |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Broker | irrelevant |
| Treaty name | label |
| Renewal month | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Loss distribution by line inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: model risk. |
| Treaty terms inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: complexity. |
| Reinsurer credit inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: changes. |
| Capital relief inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: model dependent. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: reinsurance_treaty_allocation_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: loss_distribution_by_line, type: double, nullable: false }
    - { name: treaty_terms, type: double, nullable: false }
    - { name: reinsurer_credit, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Loss distribution by line and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Treaty terms against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Loss distribution by line, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE reinsurance_treaty_allocation_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE reinsurance_treaty_allocation_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES reinsurance_treaty_allocation_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE reinsurance_treaty_allocation_assignments (
  plan_id TEXT NOT NULL REFERENCES reinsurance_treaty_allocation_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE reinsurance_treaty_allocation_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Reinsurance Treaty Allocation Optimisation": Choose how risks are ceded across reinsurance treaties to reduce capital and volatility at an acceptable premium. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Capital: risk-weighted assets and the capital ratio | Regulators require banks to hold capital against risk-weighted assets, where each exposure's weight depends on its type, rating and collateral. Reducing RWA by selling, hedging or restructuring frees capital but costs income, so the choice is a trade-off between capital use and return. | Optimisation models must use the regulatory definitions exactly, and a reduction that cannot be executed is not a reduction. |
| Expected credit loss, IFRS 9 staging and provisions | Banks hold provisions against expected credit losses: twelve-month loss for performing loans (stage 1), lifetime loss once credit risk has increased significantly (stage 2) and for impaired loans (stage 3). Probability of default, loss given default and exposure at default are combined across scenarios, and a stage change can move provisions sharply. | A model that is slightly wrong near a stage boundary can move reported profit, so stability, hysteresis and explainability matter as much as discrimination. |
| Insurance: pricing, underwriting, claims and reserving | An insurer collects premiums, underwrites risks, pays claims and holds reserves for claims not yet settled. Underwriting selects and prices risk, claims handling pays and investigates, and actuaries estimate ultimate cost from development triangles using methods such as chain-ladder. | Labels arrive years later for long-tail lines, and the same data feed serves pricing, claims and reserving teams with different definitions. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Loss distribution by line | Simulated gross losses. Input. | Leakage risk to design against: Model risk. |
| A signal-versus-noise trap in this use case: Net result | The true signal is net loss distribution after recoveries; the common noise is gross loss. | Reinsurance changes the tail. |

**Ask the experts**

- [ ] What exactly does "Treaty limits and counterparty credit limits" mean in practice for reinsurance treaty allocation optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Loss distribution by line" and "Treaty terms", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Reinsurance spend per unit of capital relief" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising against one simulation set, and who can confirm the cut-off times and splits?
- [ ] How often does "Hard market" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Reinsurance | Insurance bought by an insurer to transfer part of its risk to another company. |
| Treaty | A reinsurance contract covering a whole book of business rather than a single risk. |
| PD, LGD, EAD | Probability of default, loss given default and exposure at default: the three inputs to expected credit loss. |
| RWA | Risk-weighted assets: exposures scaled by regulatory risk weights, used to compute capital requirements. |
| Catastrophe model | A simulation of hazard, exposure and vulnerability that estimates insured losses from events such as storms or earthquakes. |
| PFE | Potential future exposure: a high percentile of a counterparty's future exposure to the bank, used for limits. |
| Netting set | A group of trades with one counterparty that can legally be offset against each other on default. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| Policy | The rule that maps a situation to an action. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
