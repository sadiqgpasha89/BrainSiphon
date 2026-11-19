# Private Wealth Client Attrition Early Warning: data and feature specification

> Generated from the blueprint `bfsi/private-wealth-client-attrition` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Private Wealth Client Attrition Early Warning · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Private Wealth Client Attrition Early Warning": Identify high-net-worth clients likely to move assets away in the next 6 months so the relationship team can act. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Retention actions change labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Net outflow 90d share | outflows over assets for 90 days | Leading indicator | Seasonal tax payments |   |   |   |
| Contact gap | days since the last advisor contact | Neglect | Contacts logged late |   |   |   |
| Performance gap | client return versus benchmark and peer | Dissatisfaction | Mandate mismatch |   |   |   |
| Advisor departure | advisor leaving the firm | Large effect | Known in advance |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Outflow | Net asset outflow share, not only account closure | Account closure flag | Clients thin accounts before leaving |
| Advisor | Advisor changes and departures | Client attributes only | Advisor exits drive attrition |
| Life events | Inheritance, sale of business | Age | Events trigger reviews |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Client birthday | irrelevant |
| Account opening channel | cohort |
| Email domain | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Net outflow 90d share inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: seasonal tax payments. |
| Contact gap inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contacts logged late. |
| Performance gap inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: mandate mismatch. |
| Advisor departure inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: known in advance. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: private_wealth_client_attrition_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: net_outflow_90d_share, type: double, nullable: false }
    - { name: contact_gap, type: double, nullable: false }
    - { name: performance_gap, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Net outflow 90d share and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Contact gap against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Net outflow 90d share, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open University Learning Analytics Dataset (OULAD) | https://analyse.kmi.open.ac.uk/open_dataset | CC BY 4.0 (see the page) | Student demographics, VLE click streams and outcomes for 32,000 students | UK distance learning; coarse click aggregation. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Predict Students' Dropout and Academic Success | https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success | CC BY 4.0 (see the UCI page) | 4,400 students with enrolment and early-performance features and a dropout label | One institution; small. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE private_wealth_client_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE private_wealth_client_outputs (
  run_id TEXT NOT NULL REFERENCES private_wealth_client_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE private_wealth_client_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE private_wealth_client_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Private Wealth Client Attrition Early Warning": Identify high-net-worth clients likely to move assets away in the next 6 months so the relationship team can act. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Wealth management, advice and suitability | Advisers recommend products to clients under a duty to act in the client's interest. Suitability requires that a recommendation fits the client's objectives, risk tolerance, knowledge and circumstances, and firms must evidence this and detect mis-selling. | Anything that suggests a product must be filtered by suitability rules, and the adviser, not the model, remains accountable. |
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Net outflow 90d share | Outflows over assets for 90 days. Leading indicator. | Leakage risk to design against: Seasonal tax payments. |
| A signal-versus-noise trap in this use case: Outflow | The true signal is net asset outflow share, not only account closure; the common noise is account closure flag. | Clients thin accounts before leaving. |

**Ask the experts**

- [ ] What exactly does "Rank only, no automatic action" mean in practice for private wealth client attrition early warning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Net outflow 90d share" and "Contact gap", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Assets retained" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: retention actions change labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Planned large withdrawal" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Suitability | The requirement that a recommended product fits the client's objectives, risk tolerance and circumstances. |
| Rebalancing | Trading a portfolio back to its target allocation after market moves. |
| Corporate action | An event initiated by an issuer, such as a dividend, split or merger, that affects security holders. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Persistency | The share of policies that stay in force over time; lapse is its opposite. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| ASR | Automatic speech recognition: converting audio of calls into text. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
