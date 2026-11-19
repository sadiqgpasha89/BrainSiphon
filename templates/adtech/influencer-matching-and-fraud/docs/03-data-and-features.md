# Influencer Matching & Fake-Follower Detection: data and feature specification

> Generated from the blueprint `adtech/influencer-matching-and-fraud` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Influencer Matching & Fake-Follower Detection · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Influencer Matching & Fake-Follower Detection": Match brands to authentic creators with audiences that fit, and detect inflated followings and engagement pods. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Platform-provided signals manipulated.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Engagement authenticity score | comment diversity and timing | Fake engagement | NLP |   |   |   |
| Follower growth anomalies | sudden spikes | Bought followers | Time series |   |   |   |
| Audience affinity embedding | audience interests vs brand | Fit | Aggregates |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Authenticity | Engagement quality and follower-graph structure | Follower counts | Follower counts are purchasable |
| Fit | Audience-brand affinity not just topic match | Category match | Audience overlap decides performance |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Follower count alone | gameable |
| Profile photo | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Engagement authenticity score inputs | Ad platform engineering | Campaign and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: NLP. |
| Follower growth anomalies inputs | Measurement science | Billing and invoicing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: time series. |
| Audience affinity embedding inputs | Privacy engineering | Identity graph and consent store (CMP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: aggregates. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: influencer_matching_and_fraud_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: engagement_authenticity_score, type: double, nullable: false }
    - { name: follower_growth_anomalies, type: double, nullable: false }
    - { name: audience_affinity_embedding, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Engagement authenticity score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Follower growth anomalies against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Engagement authenticity score, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Elliptic Bitcoin transaction graph | https://www.kaggle.com/datasets/ellipticco/elliptic-data-set | See the dataset page; free Kaggle login | 200K Bitcoin transactions as a graph with licit and illicit labels and temporal steps | Anonymised features; labels cover only part of the graph. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE influencer_matching_and_fraud_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE influencer_matching_and_fraud_outputs (
  run_id TEXT NOT NULL REFERENCES influencer_matching_and_fraud_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE influencer_matching_and_fraud_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE influencer_matching_and_fraud_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Influencer Matching & Fake-Follower Detection": Match brands to authentic creators with audiences that fit, and detect inflated followings and engagement pods. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fraud, bots and invalid traffic | Click farms, bots and fake installs consume budget and distort models. Detection mixes device and network signals, behavioural patterns and downstream quality signals such as retention or conversion. | Filtering must happen before billing and before model training, or the system learns to pay for fraud. |
| Creative, brand safety and ad quality | The ad itself (image, video, copy) affects performance, and unsafe or non-compliant placements harm brands. Generative tools produce variants, and moderation checks copy against policy and context. | Optimising click rate alone rewards clickbait; guardrails for quality, compliance and brand suitability are part of the objective. |
| Privacy and signal loss | Consent rules (GDPR, CCPA), platform changes such as app tracking limits and the phase-out of third-party cookies remove cross-site identifiers. Models rely more on context, first-party signals and aggregated data. | Features you can use today may be unavailable next year; design for graceful loss of signals. |
| Graph learning and its pitfalls | Graph neural networks and graph features (degree, centrality, personalised PageRank, motifs) propagate information along edges. Leakage hides in the split: random edge splits put future or neighbouring information into training; time-based and node-based splits are safer. | Evaluate on whole communities or later periods, and compare with simple hand-built graph features before adding a GNN. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Engagement authenticity score | Comment diversity and timing. Fake engagement. | Leakage risk to design against: NLP. |
| A signal-versus-noise trap in this use case: Authenticity | The true signal is engagement quality and follower-graph structure; the common noise is follower counts. | Follower counts are purchasable. |

**Ask the experts**

- [ ] What exactly does "Audience demographics privacy" mean in practice for influencer matching & fake-follower detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Engagement authenticity score" and "Follower growth anomalies", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cost per engagement on authentic audience" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: platform-provided signals manipulated, and who can confirm the cut-off times and splits?
- [ ] How often does "Engagement pods mimic organic comments" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Influencer marketing | Paying content creators to promote products, where audience authenticity matters. |
| Clean room | A secure environment where two parties combine data for analysis without exposing individual records. |
| Brand safety | Keeping ads away from content that could harm the advertiser's reputation. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Retargeting | Showing ads to people who have already visited a site or product. |
| Lookalike audience | A group of people who resemble an advertiser's existing customers. |
| Seed audience | The known customers used as the starting point for building a lookalike audience. |
| Identity graph | A mapping that links devices, browsers and accounts that belong to the same person or household. |
| Differential privacy | A mathematical guarantee that adding noise limits what any output reveals about one person. |
| Adstock | The lagged, decaying effect of advertising that continues after the ad is seen. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Coverage | The share of the catalogue that is ever recommended. |
| Matrix factorisation | Learning user and item vectors whose dot product predicts the rating or interaction. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
