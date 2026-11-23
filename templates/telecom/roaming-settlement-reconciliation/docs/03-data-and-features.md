# Roaming Settlement Reconciliation: data and feature specification

> Generated from the blueprint `telecom/roaming-settlement-reconciliation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Roaming Settlement Reconciliation · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Roaming Settlement Reconciliation": Match roaming usage records between partner operators and flag mismatches and disputes before settlement so wholesale revenue and cost are accurate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fuzzy matching without contract rules.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Unmatched record share | share of records without a partner match by partner | Dispute signal | Per period |   |   |   |
| Rate and tax mismatch | difference between the billed and contract rate | Pricing disputes | Contract table needed |   |   |   |
| Duplicate record flag | repeated record keys | Double billing | Needs the record key |   |   |   |
| Partner dispute history | dispute rate and win rate by partner | Prioritises effort | Recent windows |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Key | Partner-agreed record identifiers and tolerances | Fuzzy matching only | Settlement needs rule-based proof |
| Exceptions | Ranked mismatch reasons | A raw difference total | Finance needs the reason to dispute |
| Timing | Late records included by event time | Cut-off by file date | Late files change totals |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Subscriber name | irrelevant and private |
| File name | an artefact |
| Region alone | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Unmatched record share inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: per period. |
| Rate and tax mismatch inputs | OSS/BSS platform team | BSS: CRM, order management and billing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract table needed. |
| Duplicate record flag inputs | Customer data office | Network element configuration and orchestration layer | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: needs the record key. |
| Partner dispute history inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: recent windows. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: roaming_settlement_reconciliation_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: unmatched_record_share, type: double, nullable: false }
    - { name: rate_and_tax_mismatch, type: double, nullable: false }
    - { name: duplicate_record_flag, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Unmatched record share and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rate and tax mismatch against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Unmatched record share, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE roaming_settlement_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE roaming_settlement_outputs (
  run_id TEXT NOT NULL REFERENCES roaming_settlement_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE roaming_settlement_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE roaming_settlement_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Roaming Settlement Reconciliation": Match roaming usage records between partner operators and flag mismatches and disputes before settlement so wholesale revenue and cost are accurate. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Revenue assurance finds money the operator should have billed | Usage records move through mediation, rating and billing, and errors in tariffs, mappings or partner settlements cause under-billing and leakage. Reconciling the stages finds the gaps. | Small percentage errors across millions of records become large sums, and some errors are invisible to the customer. |
| Churn has drivers and a cost to prevent | Subscribers leave because of price, network quality, service failures, competitor offers and contract end dates. Retention offers cost margin, so they should go to customers who are both at risk and persuadable. | Predicting only who will leave wastes offers on customers who would have stayed or who cannot be saved. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Unmatched record share | Share of records without a partner match by partner. Dispute signal. | Leakage risk to design against: Per period. |
| A signal-versus-noise trap in this use case: Key | The true signal is partner-agreed record identifiers and tolerances; the common noise is fuzzy matching only. | Settlement needs rule-based proof. |

**Ask the experts**

- [ ] What exactly does "Matching on record keys and tolerances agreed in partner contracts" mean in practice for roaming settlement reconciliation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Unmatched record share" and "Rate and tax mismatch", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Settlement variance" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: fuzzy matching without contract rules, and who can confirm the cut-off times and splits?
- [ ] How often does "Currency conversion differences" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Roaming | Using a network other than the home operator while travelling. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| ARPU | Average revenue per user: revenue divided by the number of subscribers in a period. |
| Mediation | The system that collects and normalises usage records before billing. |
| Interconnect | Paying and settling traffic between operators. |
| Rating | Applying tariffs to usage records to calculate charges. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
