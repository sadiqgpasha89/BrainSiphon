# Corporate Relationship Manager Lead Prioritisation: data and feature specification

> Generated from the blueprint `bfsi/corporate-relationship-manager-lead-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corporate Relationship Manager Lead Prioritisation · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Corporate Relationship Manager Lead Prioritisation": Rank corporate clients and prospects for relationship-manager outreach by the likelihood and value of a product need. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past calls were not random, so outcomes reflect who was called and not who needed a product.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Cash and debt events | upcoming debt maturities and large payments from the client's own accounts | A direct trigger for financing and treasury needs | Access depends on the client's accounts with the bank |   |   |   |
| News and filings | acquisition, expansion or leadership news in public sources | An external trigger | Noisy, so verify the source |   |   |   |
| Product gap | products held by similar clients that this client does not hold | Cross-sell potential | Fit depends on size and sector |   |   |   |
| Interaction recency | days since the last meaningful contact | Prioritises neglected clients | Logging in the CRM is inconsistent |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Need | Event-driven needs such as acquisitions, expansions and rate moves | The products a client already holds | Holdings show the past and not the next need |
| Value | Expected revenue of the opportunity | The probability of a need alone | A likely but low-value call wastes a manager's scarce time |
| Timing | The window in which the need arises | A static list ranked once | Needs have timing, and a call a month late is useless |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Company name | A label with no information on need |
| RM | The manager's identity biases the ranking towards past activity |
| Email opens | Weak and often automated |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Cash and debt events inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: access depends on the client's accounts with the bank. |
| News and filings inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: noisy, so verify the source. |
| Product gap inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: fit depends on size and sector. |
| Interaction recency inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: logging in the CRM is inconsistent. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: corporate_relationship_manager_lead_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: cash_and_debt_events, type: double, nullable: false }
    - { name: news_and_filings, type: double, nullable: false }
    - { name: product_gap, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Cash and debt events and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for News and filings against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Cash and debt events, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MovieLens datasets | https://grouplens.org/datasets/movielens/ | GroupLens research terms (see the page) | Explicit ratings from 100K to 25M with timestamps, the standard recommender benchmark | Explicit ratings are not implicit clicks; film domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EdNet (Santa tutoring service) | https://github.com/riiid/ednet | CC BY-NC 4.0 per the repository | Interaction logs from more than 780,000 users over two years | Non-commercial licence and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Retailrocket recommender system dataset | https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset | CC BY-NC-SA 4.0 (see the dataset page) | About 2.7 million view, add-to-cart and purchase events with item properties | Anonymised ids and no dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE corporate_relationship_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE corporate_relationship_outputs (
  run_id TEXT NOT NULL REFERENCES corporate_relationship_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE corporate_relationship_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE corporate_relationship_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Corporate Relationship Manager Lead Prioritisation": Rank corporate clients and prospects for relationship-manager outreach by the likelihood and value of a product need. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Cash and debt events | Upcoming debt maturities and large payments from the client's own accounts. A direct trigger for financing and treasury needs. | Leakage risk to design against: Access depends on the client's accounts with the bank. |
| A signal-versus-noise trap in this use case: Need | The true signal is event-driven needs such as acquisitions, expansions and rate moves; the common noise is the products a client already holds. | Holdings show the past and not the next need. |

**Ask the experts**

- [ ] What exactly does "The reason for each ranking can be explained in plain terms to the manager" mean in practice for corporate relationship manager lead prioritisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Cash and debt events" and "News and filings", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Pipeline created" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: past calls were not random, so outcomes reflect who was called and not who needed a product, and who can confirm the cut-off times and splits?
- [ ] How often does "Conflict wall" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| NII | Net interest income: interest earned on assets minus interest paid on liabilities. |
| Intraday liquidity | The funds a bank needs during the day to make payments before incoming payments arrive. |
| Corporate action | An event initiated by an issuer, such as a dividend, split or merger, that affects security holders. |
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| ALM | Asset-liability management: managing the balance sheet so rate and liquidity risks stay within appetite. |
| ASR | Automatic speech recognition: converting audio of calls into text. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Position bias | Higher slots get more attention regardless of relevance. |
| MRR | Mean reciprocal rank: the average of one over the rank of the first relevant item. |
| Hit rate@K | The share of cases in which the true item appears in the top K. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
