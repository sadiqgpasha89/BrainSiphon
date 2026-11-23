# Support Ticket to Bug Linking: data and feature specification

> Generated from the blueprint `devtools/support-ticket-to-bug-linking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Support Ticket to Bug Linking · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Support Ticket to Bug Linking": Link customer support tickets to the engineering bugs behind them so engineering sees real customer impact and support sees fix status. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Customer identity in bug trackers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Error message and version match | reported error and version | Strong evidence | From extraction |   |   |   |
| Text similarity to bug reports | embedding similarity | Candidate | From the model |   |   |   |
| Product area and feature | classified area | Filter | From classification |   |   |   |
| Customer tier | contract tier | Impact weighting | From the CRM |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Match | Same root problem | Same product area | Areas contain many bugs |
| Privacy | Redacted ticket text | Customer identity in engineering tools | Engineers do not need identities |
| Value | Impact counts and fix status | A link list | Teams need prioritisation evidence |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | personal data |
| Agent name | irrelevant |
| Ticket channel | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Error message and version match inputs | Developer experience | Source control and code review platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from extraction. |
| Text similarity to bug reports inputs | Platform engineering | CI/CD and artifact registry | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the model. |
| Product area and feature inputs | Application security | Issue tracker and developer portal | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from classification. |
| Customer tier inputs | Developer experience | Source control and code review platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the CRM. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: support_ticket_to_bug_linking_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: error_message_and_version_match, type: double, nullable: false }
    - { name: text_similarity_to_bug_reports, type: double, nullable: false }
    - { name: product_area_and_feature, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Error message and version match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Text similarity to bug reports against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Error message and version match, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Customer Support on Twitter | https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter | See the dataset page; free Kaggle login | About 3 million tweets and replies between customers and company support accounts | Public social posts; informal language. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE support_ticket_to_bug_linking_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  error_message_and_version_match    DOUBLE PRECISION,
  text_similarity_to_bug_reports     DOUBLE PRECISION,
  product_area_and_feature           DOUBLE PRECISION,
  customer_tier                      DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE support_ticket_to_bug_linking_decisions (
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
CREATE TABLE support_ticket_to_bug_linking_labels (
  decision_id    UUID        NOT NULL REFERENCES support_ticket_to_bug_linking_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Support Ticket to Bug Linking": Link customer support tickets to the engineering bugs behind them so engineering sees real customer impact and support sees fix status. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Pipelines fail for many reasons | A broken build can come from code, dependencies, infrastructure or configuration. Finding the first real error in a long log, and linking it to recent changes, cuts the time to fix. | A diagnosis that does not show its evidence is hard to trust. |
| Developer productivity is a team-level concept | Flow metrics such as lead time and deployment frequency describe a system. Used on individuals, they are gamed and harm trust. | Any measurement should be aggregated to teams and agreed with employee representatives where required. |
| Coding agents act with the permissions you give them | Agents that read repositories and run commands can be steered by hostile text in files, issues and web pages. They need sandboxes, short-lived scoped credentials, egress limits and human approval for risky actions. | Controls belong in the platform, not in prompt instructions that an attacker can override. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Error message and version match | Reported error and version. Strong evidence. | Leakage risk to design against: From extraction. |
| A signal-versus-noise trap in this use case: Match | The true signal is same root problem; the common noise is same product area. | Areas contain many bugs. |

**Ask the experts**

- [ ] What exactly does "Customer personal data removed before linking" mean in practice for support ticket to bug linking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Error message and version match" and "Text similarity to bug reports", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to link" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: customer identity in bug trackers, and who can confirm the cut-off times and splits?
- [ ] How often does "No matching bug" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CD | Continuous delivery or deployment: releasing changes automatically. |
| Pull request | A proposed code change submitted for review. |
| Code review | Examination of a change by another engineer. |
| Commit | A saved change to the code base. |
| Test selection | Choosing which tests to run for a change. |
| Canary release | Releasing a change to a small share of users first. |
| Feature flag | A switch that turns a feature on or off without redeploying. |
| Rollback | Returning to a previous version. |
| Lead time | The time from commit to production. |
| Secret scanning | Searching code and logs for exposed credentials. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
