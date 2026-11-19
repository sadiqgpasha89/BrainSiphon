# Expansion & Upsell Propensity: data and feature specification

> Generated from the blueprint `saas/expansion-and-upsell-propensity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Expansion & Upsell Propensity · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Expansion & Upsell Propensity": Identify accounts ready to expand seats or tiers, and the right product to propose, to prioritise sales effort. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using signals recorded after sales engagement.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Seat utilisation near cap | active seats over licensed | Need for more | Billing |   |   |   |
| Gated-feature hits | attempts to use paid features | Intent | Paywall events |   |   |   |
| New-team adoption | new departments active | Spread | Org graph |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Timing | Usage-threshold events (seat cap hit, feature gating) | Static firmographics | Intent shows in usage walls |
| Value | Expected incremental ARR | Highest propensity | Large accounts matter more than many tiny ones |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Marketing email opens | weak |
| Account age | confounded |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Seat utilisation near cap inputs | Product analytics | Tenant and entitlement service | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: billing. |
| Gated-feature hits inputs | Platform engineering | Product event warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: paywall events. |
| New-team adoption inputs | Customer success operations | CRM and billing (subscriptions) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: org graph. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: expansion_and_upsell_propensity_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: seat_utilisation_near_cap, type: double, nullable: false }
    - { name: gated_feature_hits, type: double, nullable: false }
    - { name: new_team_adoption, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Seat utilisation near cap and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Gated-feature hits against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Seat utilisation near cap, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE expansion_and_upsell_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE expansion_and_upsell_outputs (
  run_id TEXT NOT NULL REFERENCES expansion_and_upsell_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE expansion_and_upsell_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE expansion_and_upsell_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Expansion & Upsell Propensity": Identify accounts ready to expand seats or tiers, and the right product to propose, to prioritise sales effort. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| B2B SaaS metrics and the customer lifecycle | Software-as-a-service companies sell subscriptions to businesses. Key quantities are annual recurring revenue (ARR), net revenue retention, churn, expansion and the sales pipeline. Customers move from lead to account, trial, activation, expansion and renewal, with product usage as the leading signal. | Targets like churn and expansion are slow and censored (many accounts have not renewed yet), so models need survival-style handling and care about leakage from billing events. |
| Identity resolution and the customer data platform | Customer data platforms merge records from many sources into one profile. Matching leads to accounts, cleaning duplicates and resolving identities are entity-resolution problems with strict privacy rules. | A wrong merge combines two real customers, with privacy consequences, so precision comes before recall. |
| Product-led growth, pricing and experimentation | Many products grow by letting users try before they buy. Activation (reaching first value), usage depth and team spread predict conversion; pricing and packaging decide who pays for what. A/B tests with few accounts and long horizons need variance reduction and sequential methods. | Underpowered experiments and peeking produce false wins, so experimentation platforms enforce rules about duration and metrics. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Seat utilisation near cap | Active seats over licensed. Need for more. | Leakage risk to design against: Billing. |
| A signal-versus-noise trap in this use case: Timing | The true signal is usage-threshold events (seat cap hit, feature gating); the common noise is static firmographics. | Intent shows in usage walls. |

**Ask the experts**

- [ ] What exactly does "Sales capacity" mean in practice for expansion & upsell propensity: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Seat utilisation near cap" and "Gated-feature hits", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Expansion ARR per rep" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using signals recorded after sales engagement, and who can confirm the cut-off times and splits?
- [ ] How often does "Free pilots look like expansion" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Expansion / upsell | Revenue growth from existing customers buying more seats, features or tiers. |
| ARR / MRR | Annual or monthly recurring revenue: the value of active subscriptions normalised to a year or month. |
| NRR / GRR | Net and gross revenue retention: how much of last period's revenue remains, with or without expansion. |
| Seat-based pricing | Charging per user of the product. |
| Usage-based billing | Charging according to consumption, such as API calls or storage, which makes revenue less predictable. |
| Sequential testing | Statistical methods that allow results to be checked repeatedly without inflating false positives. |
| Feature flag | A switch that turns a feature on for chosen users, used for gradual rollouts and experiments. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Distribution shift | A change in the data a model sees compared with training. |
