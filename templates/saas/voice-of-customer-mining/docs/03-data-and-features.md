# Voice-of-Customer Mining: data and feature specification

> Generated from the blueprint `saas/voice-of-customer-mining` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Voice-of-Customer Mining · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Voice-of-Customer Mining": Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Mention counts as importance.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Theme volume trend | mentions over time | Emerging issues | Taxonomy |   |   |   |
| Revenue-weighted impact | ARR of accounts mentioning | Priority | CRM join |   |   |   |
| Sentiment by theme | aspect-based sentiment | Severity | Model |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Weighting | Weight themes by account revenue and churn risk | Count mentions | Loud small customers can dominate |
| Stability | Stable taxonomy with drift handling | Re-clustering each time | Changing clusters break trend tracking |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Text length | weak |
| Channel | bias |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Theme volume trend inputs | Product analytics | Tenant and entitlement service | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: taxonomy. |
| Revenue-weighted impact inputs | Platform engineering | Product event warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: CRM join. |
| Sentiment by theme inputs | Customer success operations | CRM and billing (subscriptions) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: model. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: voice_of_customer_mining_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: theme_volume_trend, type: double, nullable: false }
    - { name: revenue_weighted_impact, type: double, nullable: false }
    - { name: sentiment_by_theme, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Theme volume trend and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Revenue-weighted impact against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Theme volume trend, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE voice_of_customer_mining_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE voice_of_customer_mining_fields (
  document_id TEXT NOT NULL REFERENCES voice_of_customer_mining_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE voice_of_customer_mining_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Voice-of-Customer Mining": Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Identity resolution and the customer data platform | Customer data platforms merge records from many sources into one profile. Matching leads to accounts, cleaning duplicates and resolving identities are entity-resolution problems with strict privacy rules. | A wrong merge combines two real customers, with privacy consequences, so precision comes before recall. |
| B2B SaaS metrics and the customer lifecycle | Software-as-a-service companies sell subscriptions to businesses. Key quantities are annual recurring revenue (ARR), net revenue retention, churn, expansion and the sales pipeline. Customers move from lead to account, trial, activation, expansion and renewal, with product usage as the leading signal. | Targets like churn and expansion are slow and censored (many accounts have not renewed yet), so models need survival-style handling and care about leakage from billing events. |
| Evaluating a docs assistant | A golden set of real questions with known answers, including unanswerable and version-specific ones, is scored for correctness, faithfulness to the cited source, abstention when the docs are silent and, for code, whether the snippet compiles and runs. Questions written from page headings are too easy. | Abstaining is a feature. A refusal that is right is better than an answer that is plausible and wrong. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Theme volume trend | Mentions over time. Emerging issues. | Leakage risk to design against: Taxonomy. |
| A signal-versus-noise trap in this use case: Weighting | The true signal is weight themes by account revenue and churn risk; the common noise is count mentions. | Loud small customers can dominate. |

**Ask the experts**

- [ ] What exactly does "Multi-source dedup" mean in practice for voice-of-customer mining: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Theme volume trend" and "Revenue-weighted impact", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Roadmap decisions informed" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: mention counts as importance, and who can confirm the cut-off times and splits?
- [ ] How often does "Taxonomy drift as product changes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| ARR / MRR | Annual or monthly recurring revenue: the value of active subscriptions normalised to a year or month. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Embedding | A vector representing the meaning of text, used for similarity search that tolerates different wording. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| Churn | Customers or revenue lost over a period; logo churn counts accounts, revenue churn counts money. |
| Renewal | The point at which a customer decides whether to continue a subscription. |
| CDP | Customer data platform: a system that unifies customer data from many sources into profiles. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
