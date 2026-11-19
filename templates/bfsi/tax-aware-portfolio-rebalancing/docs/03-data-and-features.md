# Tax-Aware Portfolio Rebalancing: data and feature specification

> Generated from the blueprint `bfsi/tax-aware-portfolio-rebalancing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tax-Aware Portfolio Rebalancing · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Tax-Aware Portfolio Rebalancing": Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Back-test ignores lot constraints.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Drift versus band | allocation minus target relative to the band | Trigger | Targets change |   |   |   |
| Unrealised gain by lot | gain per lot and holding period | Tax cost | Lot data errors |   |   |   |
| Cash flow available | contributions and income | Can rebalance without selling | Timing |   |   |   |
| Trading cost estimate | spread and fee by security | Cost | Estimates vary |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| After tax | Return after tax and cost | Pre-tax tracking error alone | A perfect rebalance can cost more than it earns |
| Lots | Tax lot selection | Average cost | Lot choice changes the tax by large amounts |
| Tolerance | Drift bands to avoid churn | Rebalance to target every time | Churn costs more than small drift |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Account nickname | irrelevant |
| Advisor | irrelevant |
| Statement date | arbitrary |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Drift versus band inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: targets change. |
| Unrealised gain by lot inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: lot data errors. |
| Cash flow available inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: timing. |
| Trading cost estimate inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: estimates vary. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: tax_aware_portfolio_rebalancing_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: drift_versus_band, type: double, nullable: false }
    - { name: unrealised_gain_by_lot, type: double, nullable: false }
    - { name: cash_flow_available, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Drift versus band and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Unrealised gain by lot against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Drift versus band, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE tax_aware_portfolio_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE tax_aware_portfolio_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES tax_aware_portfolio_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE tax_aware_portfolio_assignments (
  plan_id TEXT NOT NULL REFERENCES tax_aware_portfolio_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE tax_aware_portfolio_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Tax-Aware Portfolio Rebalancing": Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Wealth management, advice and suitability | Advisers recommend products to clients under a duty to act in the client's interest. Suitability requires that a recommendation fits the client's objectives, risk tolerance, knowledge and circumstances, and firms must evidence this and detect mis-selling. | Anything that suggests a product must be filtered by suitability rules, and the adviser, not the model, remains accountable. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Regulatory change and reporting | Rules change constantly across prudential, conduct and financial crime regimes. Firms track consultations, map obligations to policies and controls, report to supervisors on fixed schedules and keep evidence of compliance. | Language-model tools that summarise regulation must cite the paragraph and the version in force, because a confident summary of superseded text is worse than none. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Drift versus band | Allocation minus target relative to the band. Trigger. | Leakage risk to design against: Targets change. |
| A signal-versus-noise trap in this use case: After tax | The true signal is return after tax and cost; the common noise is pre-tax tracking error alone. | A perfect rebalance can cost more than it earns. |

**Ask the experts**

- [ ] What exactly does "Respect client restrictions and wash-sale rules" mean in practice for tax-aware portfolio rebalancing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Drift versus band" and "Unrealised gain by lot", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Net-of-tax return" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: back-test ignores lot constraints, and who can confirm the cut-off times and splits?
- [ ] How often does "Wash-sale" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Rebalancing | Trading a portfolio back to its target allocation after market moves. |
| Tax lot | A purchase of a security with its own date and cost basis, which determines the tax when sold. |
| Settlement fail | A trade that does not settle on the intended date because securities or cash are not delivered. |
| Suitability | The requirement that a recommended product fits the client's objectives, risk tolerance and circumstances. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Obligation register | A list of regulatory requirements mapped to the policies and controls that satisfy them. |
| Policy | The rule that maps a situation to an action. |
| Doubly robust estimator | An off-policy estimator that combines a reward model with propensity weighting. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
