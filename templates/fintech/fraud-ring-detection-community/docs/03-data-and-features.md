# Fraud Ring Detection via Community Detection: data and feature specification

> Generated from the blueprint `fintech/fraud-ring-detection-community` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fraud Ring Detection via Community Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Fraud Ring Detection via Community Detection": Find coordinated fraud rings across accounts, devices and merchants for batch takedown rather than one-at-a-time blocking. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on rings found by the same heuristic.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Shared-resource density | share of accounts in a cluster sharing devices or payment instruments | Ring cohesion | Resource IDs hashed at event time |   |   |   |
| Temporal co-burst | correlation of activity bursts among cluster members | Scripted behaviour | Bin windows before labels |   |   |   |
| Cluster age and growth | rate of new accounts joining the cluster | Rings grow in waves | Snapshot cluster membership per day |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Structure | Dense bipartite cores and temporal burst co-activity | Individual account anomaly scores | Coordinated actors keep each account just under thresholds |
| Scale | Incremental community updates | Rebuilding the full graph daily | Full rebuilds cannot meet daily cadence at 1B edges |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Cluster size alone | large benign communities exist (families, offices) |
| Edge weights from raw amounts | dominated by whales |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Shared-resource density inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: resource IDs hashed at event time. |
| Temporal co-burst inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: bin windows before labels. |
| Cluster age and growth inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: snapshot cluster membership per day. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: fraud_ring_detection_community_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: shared_resource_density, type: double, nullable: false }
    - { name: temporal_co_burst, type: double, nullable: false }
    - { name: cluster_age_and_growth, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Shared-resource density and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Temporal co-burst against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Shared-resource density, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Elliptic Bitcoin transaction graph | https://www.kaggle.com/datasets/ellipticco/elliptic-data-set | See the dataset page; free Kaggle login | 200K Bitcoin transactions as a graph with licit and illicit labels and temporal steps | Anonymised features; labels cover only part of the graph. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE fraud_ring_detection_community_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE fraud_ring_detection_community_outputs (
  run_id TEXT NOT NULL REFERENCES fraud_ring_detection_community_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE fraud_ring_detection_community_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE fraud_ring_detection_community_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Fraud Ring Detection via Community Detection": Find coordinated fraud rings across accounts, devices and merchants for batch takedown rather than one-at-a-time blocking. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| The authorisation flow and where the model sits | The cardholder pays a merchant, the merchant's acquirer or payment service provider sends an authorisation request through the card network to the issuer, and the issuer approves or declines. The fraud model typically runs at the issuer (which sees the card's whole history) or at the PSP and merchant (which see the basket, the device and the checkout session), and each sees different data. | Your feature list is limited to what your position in the chain can see, and the latency budget is a slice of the whole authorisation round trip. |
| Kinds of fraud look different | Card-not-present fraud (online purchases with stolen card details), card testing (many tiny purchases to find live cards), account takeover (a criminal uses the genuine customer's account), lost or stolen card and first-party fraud (the customer disputes a purchase they made) are different problems. Velocity features catch testing and fast cash-outs; takeover needs device, address-change and session signals. | One score for all of them hides which attack you miss. Evaluate and report by fraud type, as the worked example's missed takeovers show. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Shared-resource density | Share of accounts in a cluster sharing devices or payment instruments. Ring cohesion. | Leakage risk to design against: Resource IDs hashed at event time. |
| A signal-versus-noise trap in this use case: Structure | The true signal is dense bipartite cores and temporal burst co-activity; the common noise is individual account anomaly scores. | Coordinated actors keep each account just under thresholds. |

**Ask the experts**

- [ ] What exactly does "Ring decisions need human sign-off" mean in practice for fraud ring detection via community detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Shared-resource density" and "Temporal co-burst", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Accounts removed per ring" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on rings found by the same heuristic, and who can confirm the cut-off times and splits?
- [ ] How often does "Corporate NAT merges unrelated users" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Account takeover (ATO) | A criminal gaining control of a genuine customer's account or card credentials and acting as them. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| PAN | Primary account number, the 13-19 digit number on the card; storing it is tightly controlled, so systems use tokens instead. |
| BIN | Bank identification number, the first 6-8 digits of a PAN that identify the issuing bank and card product. |
| Issuer | The bank that issued the card to the cardholder and decides whether to approve each authorisation. |
| Acquirer | The bank or processor that handles card payments on behalf of the merchant and routes authorisations to the network. |
| PSP | Payment service provider, a company such as a payment gateway that gives merchants one integration for accepting payments. |
| Card network | The scheme such as Visa or Mastercard that carries authorisation messages between acquirer and issuer and sets dispute rules. |
| Authorisation | The real-time request in which the issuer approves or declines a payment; money moves later in clearing and settlement. |
| Clearing and settlement | The batch process after authorisation in which transaction details are exchanged and funds are actually transferred. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Modularity | A score for how well a division of the graph into groups separates dense communities. |
| Node / edge | The entities in a graph and the relationships between them. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
