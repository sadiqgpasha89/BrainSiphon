# Cross-Device Graph for Measurement: data and feature specification

> Generated from the blueprint `adtech/cross-device-graph` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Device Graph for Measurement · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Cross-Device Graph for Measurement": Link devices belonging to the same person or household to unify reach, frequency and attribution measurement. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on deterministic links only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Shared login events | authenticated co-occurrence | Gold-standard links | Hashing |   |   |   |
| IP co-occurrence over time | repeated shared networks | Probabilistic | Public IP filter |   |   |   |
| Behavioural similarity | co-browsing patterns | Soft evidence | Consent |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Precision | Link precision with calibrated confidence | Maximal link recall | Wrong links inflate reach and break attribution |
| Scope | Household vs person vs device levels | Single ambiguous cluster | Different uses need different granularity |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Device brand | weak |
| Screen resolution | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Shared login events inputs | Ad platform engineering | Campaign and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: hashing. |
| IP co-occurrence over time inputs | Measurement science | Billing and invoicing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: public IP filter. |
| Behavioural similarity inputs | Privacy engineering | Identity graph and consent store (CMP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: consent. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cross_device_graph_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: shared_login_events, type: double, nullable: false }
    - { name: ip_co_occurrence_over_time, type: double, nullable: false }
    - { name: behavioural_similarity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Shared login events and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for IP co-occurrence over time against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Shared login events, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Elliptic Bitcoin transaction graph | https://www.kaggle.com/datasets/ellipticco/elliptic-data-set | See the dataset page; free Kaggle login | 200K Bitcoin transactions as a graph with licit and illicit labels and temporal steps | Anonymised features; labels cover only part of the graph. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE cross_device_graph_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE cross_device_graph_outputs (
  run_id TEXT NOT NULL REFERENCES cross_device_graph_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE cross_device_graph_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE cross_device_graph_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Cross-Device Graph for Measurement": Link devices belonging to the same person or household to unify reach, frequency and attribution measurement. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Audiences, identity and privacy | Targeting uses audience segments, lookalikes built from seed customers, and identity graphs that link devices and cookies. Consent laws, platform rules and cookie deprecation push the industry to context, first-party data, clean rooms and aggregated or privacy-preserving measurement. | Features and joins that were routine are becoming unavailable; designs must tolerate missing identifiers and prove privacy properties. |
| Creative, brand safety and ad quality | The ad itself (image, video, copy) affects performance, and unsafe or non-compliant placements harm brands. Generative tools produce variants, and moderation checks copy against policy and context. | Optimising click rate alone rewards clickbait; guardrails for quality, compliance and brand suitability are part of the objective. |
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Shared login events | Authenticated co-occurrence. Gold-standard links. | Leakage risk to design against: Hashing. |
| A signal-versus-noise trap in this use case: Precision | The true signal is link precision with calibrated confidence; the common noise is maximal link recall. | Wrong links inflate reach and break attribution. |

**Ask the experts**

- [ ] What exactly does "Privacy law compliance" mean in practice for cross-device graph for measurement: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Shared login events" and "IP co-occurrence over time", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Reach measurement accuracy" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on deterministic links only, and who can confirm the cut-off times and splits?
- [ ] How often does "Large shared networks (offices)" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Identity graph | A mapping that links devices, browsers and accounts that belong to the same person or household. |
| Differential privacy | A mathematical guarantee that adding noise limits what any output reveals about one person. |
| Out-of-home (OOH) | Advertising in physical places such as billboards and transit, measured with location data. |
| Normalised cross-entropy (NE) | Log loss divided by the log loss of always predicting the average click rate; below 1 means better than the base rate. |
| Frequency cap | A limit on how many times one person sees the same ad. |
| Clean room | A secure environment where two parties combine data for analysis without exposing individual records. |
| Geo experiment | A test that varies advertising across regions to measure lift without user-level tracking. |
| CTV | Connected TV: streaming video on internet-connected television sets. |
| SKAN / ATT | Apple's privacy frameworks for app tracking and install attribution that limit user-level data. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Node / edge | The entities in a graph and the relationships between them. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
