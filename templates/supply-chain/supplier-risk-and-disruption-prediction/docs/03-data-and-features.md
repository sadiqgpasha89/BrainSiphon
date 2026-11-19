# Supplier Risk & Disruption Prediction: data and feature specification

> Generated from the blueprint `supply-chain/supplier-risk-and-disruption-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supplier Risk & Disruption Prediction · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Supplier Risk & Disruption Prediction": Predict supplier failures and disruptions across tiers by fusing financial, operational, geographic and news signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rare disruptions leave few labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Payment delay trend | days beyond terms over 6 months | Distress | Matured payments |   |   |   |
| Shipment slippage trend | on-time delivery rate change | Operations | Receipts |   |   |   |
| Network concentration | share of volume from a single sub-supplier | Systemic risk | Graph snapshot |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Tiers | Sub-tier network propagation of risk | Tier-1 scores only | Disruptions originate at deeper tiers |
| Signals | Leading indicators (payment delays, news, shipment slippage) | Annual financial ratios | Annual accounts are stale |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Supplier logo | none |
| Website age | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Payment delay trend inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: matured payments. |
| Shipment slippage trend inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: receipts. |
| Network concentration inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: graph snapshot. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: supplier_risk_and_disruption_prediction_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: payment_delay_trend, type: double, nullable: false }
    - { name: shipment_slippage_trend, type: double, nullable: false }
    - { name: network_concentration, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Payment delay trend and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Shipment slippage trend against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Payment delay trend, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE supplier_risk_and_disruption_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE supplier_risk_and_disruption_outputs (
  run_id TEXT NOT NULL REFERENCES supplier_risk_and_disruption_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE supplier_risk_and_disruption_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE supplier_risk_and_disruption_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Supplier Risk & Disruption Prediction": Predict supplier failures and disruptions across tiers by fusing financial, operational, geographic and news signals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Logistics networks: nodes, lanes and the physical flow | Goods move through suppliers, factories, ports, distribution centres, cross-docks and last-mile hubs. Each link has a lead time, a capacity and a cost, and disruptions (weather, strikes, congestion) propagate. Visibility data come from scans, telematics and partner feeds with delays and gaps. | Models sit on top of a physical network with hard constraints; plans must be feasible, not just predicted well. |
| Estimated time of arrival and delivery promises | ETAs combine routes, traffic, dwell times at stops and historical behaviour. Customers and planners act on them, so under- and over-estimates have different costs, and quantile predictions (a promise at the 90th percentile) are more useful than averages. | A good ETA is calibrated and updates as the shipment moves, not a single early number. |
| Procurement, suppliers and trade compliance | Buyers choose suppliers, forecast commodity prices, classify spend and negotiate contracts; importers classify goods under customs codes, screen parties against denied lists and audit freight invoices. Supplier failures and sanctions have large downstream cost. | Evidence trails and explainability matter because decisions are audited, and errors can mean fines or shipment holds. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Payment delay trend | Days beyond terms over 6 months. Distress. | Leakage risk to design against: Matured payments. |
| A signal-versus-noise trap in this use case: Tiers | The true signal is sub-tier network propagation of risk; the common noise is tier-1 scores only. | Disruptions originate at deeper tiers. |

**Ask the experts**

- [ ] What exactly does "Multi-tier visibility" mean in practice for supplier risk & disruption prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Payment delay trend" and "Shipment slippage trend", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Disruption cost avoided" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: rare disruptions leave few labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Entity resolution merges different suppliers" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Lead-time variability | How much the time to receive goods varies, which drives safety stock. |
| Control tower | A central view of a supply chain's events and exceptions, used to react to disruptions. |
| ETA | Estimated time of arrival of a shipment or vehicle. |
| Bill of materials (BOM) | The list of parts and quantities needed to make a product. |
| First-attempt delivery rate | The share of parcels delivered successfully on the first try. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
