# Support Ticket Triage & Priority: data and feature specification

> Generated from the blueprint `saas/support-ticket-triage-and-priority` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Support Ticket Triage & Priority · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Support Ticket Triage & Priority": Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from past misrouted tickets.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Account tier and SLA | contract tier | Priority | CRM |   |   |   |
| Incident linkage | active incident on product | Grouping | Status |   |   |   |
| Urgency language | classifier | Urgency | Calibration |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Combine text with account tier, product and recent incidents | Text only | Priority depends on the customer and context |
| Cost | Asymmetric cost for under-prioritising | Symmetric accuracy | Missing an urgent ticket is costly |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Ticket length | weak |
| Customer name | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Account tier and SLA inputs | Product analytics | Ticketing platform (Zendesk, ServiceNow or Salesforce Service Cloud) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: CRM. |
| Incident linkage inputs | Platform engineering | CRM and customer entitlements (tier, subscription, contractual SLA) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: status. |
| Urgency language inputs | Customer success operations | Tenant and entitlement service | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibration. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: support_ticket_triage_and_priority_inputs.v1
owner: product-analytics@example.com
system_of_record: Ticketing platform (Zendesk, ServiceNow or Salesforce Service Cloud)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: account_tier_and_sla, type: double, nullable: false }
    - { name: incident_linkage, type: double, nullable: false }
    - { name: urgency_language, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Account tier and SLA and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Incident linkage against Ticketing platform (Zendesk, ServiceNow or Salesforce Service Cloud)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Account tier and SLA, traces back to Ticketing platform (Zendesk, ServiceNow or Salesforce Service Cloud); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Customer Support on Twitter | https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter | See the dataset page; free Kaggle login | About 3 million tweets and replies between customers and company support accounts | Public social posts; informal language. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE support_ticket_triage_and_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  account_tier_and_sla               DOUBLE PRECISION,
  incident_linkage                   DOUBLE PRECISION,
  urgency_language                   DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE support_ticket_triage_and_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE support_ticket_triage_and_labels (
  decision_id    UUID        NOT NULL REFERENCES support_ticket_triage_and_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Support Ticket Triage & Priority": Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Support, success and the copilots that help them | Support teams answer tickets with help-centre articles and past replies; success managers prepare reviews for customers. Assistants draft replies, route tickets and summarise calls, with accuracy, tone and policy compliance as constraints. | Deflection that hides a wrong answer costs more than a ticket, so assistants must cite sources and escalate when unsure. |
| Identity resolution and the customer data platform | Customer data platforms merge records from many sources into one profile. Matching leads to accounts, cleaning duplicates and resolving identities are entity-resolution problems with strict privacy rules. | A wrong merge combines two real customers, with privacy consequences, so precision comes before recall. |
| Reliability engineering and AIOps | Operations teams run services against reliability targets (SLOs). Monitoring produces metrics, logs and traces; models detect anomalies, forecast capacity, correlate alerts, find root causes and sample traces. Incidents are rare, labels are scarce and systems change constantly. | Alert noise and unexplained pages burn out on-call engineers, so precision, grouping and actionable context come first. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Account tier and SLA | Contract tier. Priority. | Leakage risk to design against: CRM. |
| A signal-versus-noise trap in this use case: Context | The true signal is combine text with account tier, product and recent incidents; the common noise is text only. | Priority depends on the customer and context. |

**Ask the experts**

- [ ] What exactly does "SLA tiers" mean in practice for support ticket triage & priority: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Account tier and SLA" and "Incident linkage", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "SLA breach rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels from past misrouted tickets, and who can confirm the cut-off times and splits?
- [ ] How often does "Incident causes a flood of near-identical tickets" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Ticket deflection | Resolving a question through self-service so no support ticket is created. |
| Knowledge base | The collection of help articles an assistant can retrieve and cite. |
| Incident | An event that degrades a service and needs a response. |
| Runbook | A documented procedure for handling a known operational situation. |
| Root-cause analysis | Finding the underlying cause of an incident rather than its visible symptoms. |
| LLM gateway | A service that routes language-model requests between providers by cost, latency and quality. |
| CDP | Customer data platform: a system that unifies customer data from many sources into profiles. |
| Entity resolution | Deciding which records refer to the same real-world entity. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| F1 score | The harmonic mean of precision and recall. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
