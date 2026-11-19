# AML Graph Anomaly Detection: data and feature specification

> Generated from the blueprint `fintech/aml-graph-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AML Graph Anomaly Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "AML Graph Anomaly Detection": Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random edge split leaks future flows into training.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pass-through ratio | outflow within 24h divided by inflow | Layering moves money out fast | Needs transaction timestamps not posting dates |   |   |   |
| Cycle membership score | count of short cycles through the account in a 14-day window | Round-tripping funds | Windowing must exclude the alerting transaction itself |   |   |   |
| Counterparty risk propagation | personalised PageRank from known-bad entities | Risk spreads along flows | Seed list must be frozen before the evaluation period |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Topology | Subgraph motifs such as fan-in/fan-out, cycles and shared intermediaries | Per-account transaction amount z-scores alone | Accounts look normal individually, the pattern lives in the structure |
| Labels | SAR outcomes weighted by investigator disposition | Treating every alert closure as negative | Closed-without-SAR is not proof of legitimacy |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Transaction amount alone | structured amounts are deliberately just below thresholds |
| Account age | weakly informative and discriminatory in some jurisdictions |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pass-through ratio inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: needs transaction timestamps not posting dates. |
| Cycle membership score inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: windowing must exclude the alerting transaction itself. |
| Counterparty risk propagation inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: seed list must be frozen before the evaluation period. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: aml_graph_anomaly_detection_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pass_through_ratio, type: double, nullable: false }
    - { name: cycle_membership_score, type: double, nullable: false }
    - { name: counterparty_risk_propagation, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Pass-through ratio and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Cycle membership score against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pass-through ratio, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Elliptic Bitcoin transaction graph | https://www.kaggle.com/datasets/ellipticco/elliptic-data-set | See the dataset page; free Kaggle login | 200K Bitcoin transactions as a graph with licit and illicit labels and temporal steps | Anonymised features; labels cover only part of the graph. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM AMLSim (anti-money-laundering simulator) | https://github.com/IBM/AMLSim | Apache 2.0 (see the repository) | A simulator that generates transaction networks with injected laundering patterns | Synthetic; patterns reflect the simulator's assumptions. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE aml_graph_anomaly_detection_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE aml_graph_anomaly_detection_outputs (
  run_id TEXT NOT NULL REFERENCES aml_graph_anomaly_detection_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE aml_graph_anomaly_detection_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE aml_graph_anomaly_detection_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "AML Graph Anomaly Detection": Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Anti-money-laundering and know-your-customer | Banks must verify who customers are (KYC), monitor transactions for patterns such as structuring and layering, screen names against sanctions and politically exposed person lists, and file suspicious activity reports with regulators within deadlines. Monitoring generates alerts that investigators review; most are false. | The cost of an alert is analyst time and the cost of a miss is regulatory penalty, so evaluation uses alert-to-report ratios and investigator capacity, not accuracy. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| Graph learning and its pitfalls | Graph neural networks and graph features (degree, centrality, personalised PageRank, motifs) propagate information along edges. Leakage hides in the split: random edge splits put future or neighbouring information into training; time-based and node-based splits are safer. | Evaluate on whole communities or later periods, and compare with simple hand-built graph features before adding a GNN. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Pass-through ratio | Outflow within 24h divided by inflow. Layering moves money out fast. | Leakage risk to design against: Needs transaction timestamps not posting dates. |
| A signal-versus-noise trap in this use case: Topology | The true signal is subgraph motifs such as fan-in/fan-out, cycles and shared intermediaries; the common noise is per-account transaction amount z-scores alone. | Accounts look normal individually, the pattern lives in the structure. |

**Ask the experts**

- [ ] What exactly does "SAR filing deadlines of 30 days" mean in practice for aml graph anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pass-through ratio" and "Cycle membership score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Alert-to-SAR ratio" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: random edge split leaks future flows into training, and who can confirm the cut-off times and splits?
- [ ] How often does "Entity resolution splits one customer into two" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Layering | Moving money through many accounts and transactions to hide its origin. |
| Structuring | Splitting transactions into amounts just under reporting thresholds to avoid detection. |
| Transaction monitoring | Rules and models that scan account activity for suspicious patterns and raise alerts. |
| SAR / STR | Suspicious activity report or suspicious transaction report: the filing a bank makes to the regulator when it suspects money laundering. |
| Sanctions screening | Checking customers and payments against lists of sanctioned people, entities and countries. |
| PEP | Politically exposed person: someone with a prominent public role who needs extra scrutiny. |
| Typology | A documented pattern of how a crime is carried out, used to design detection scenarios. |
| KYC / CDD | Know your customer and customer due diligence: verifying identity and assessing risk when onboarding and during the relationship. |
| Personalised PageRank | PageRank that restarts from chosen seed nodes, used to spread risk from known bad nodes. |
| Motif | A small recurring subgraph pattern such as a cycle or a fan-out. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Node / edge | The entities in a graph and the relationships between them. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
