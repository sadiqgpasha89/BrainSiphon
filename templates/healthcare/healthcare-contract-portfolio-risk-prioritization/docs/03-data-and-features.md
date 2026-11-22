# Healthcare Contract Portfolio Risk Prioritization: data and feature specification

> Generated from the blueprint `healthcare/healthcare-contract-portfolio-risk-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Portfolio Risk Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Contract Portfolio Risk Prioritization": Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Hiding weights from owners.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Dimension exposure scores | normalised exposure for each risk dimension from verified inputs | The core components | Input snapshots |   |   |   |
| Dependency concentration | number of critical services depending on one supplier | Continuity risk | Graph at scoring time |   |   |   |
| Open obligations and incidents | overdue obligations and recent incidents linked to the contract | Operational risk | Earlier periods |   |   |   |
| Renewal proximity and value | time to renewal and annual value | Priority | Contract data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Dimensions | Legal, financial, compliance, supplier, continuity and renewal exposure kept separate | One opaque score | Different owners act on different dimensions |
| Dependencies | Shared-supplier and service dependency graph | Contract-by-contract view | Concentration risk is invisible in isolation |
| Weights | Owner-set versioned weights | Hidden weights | Owners must own the trade-off |
| Evidence | Evidence per dimension | Score only | Reviewers need the reason |
| Scenarios | Exposure under supplier failure or term change | Static ranking | Leaders want to test what-ifs |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Contract title | not risk |
| Counterparty size alone | not exposure |
| Owner seniority | not risk |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Dimension exposure scores inputs | Enterprise risk | Contract management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: input snapshots. |
| Dependency concentration inputs | Legal | Supplier risk and performance records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: graph at scoring time. |
| Open obligations and incidents inputs | Procurement | Obligation register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: earlier periods. |
| Renewal proximity and value inputs | Compliance | Audit and incident records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_contract_portfolio_risk_inputs.v1
owner: enterprise-risk@example.com
system_of_record: Contract management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: dimension_exposure_scores, type: double, nullable: false }
    - { name: dependency_concentration, type: double, nullable: false }
    - { name: open_obligations_and_incidents, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Dimension exposure scores and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Dependency concentration against Contract management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Dimension exposure scores, traces back to Contract management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Diabetes 130-US Hospitals (UCI) | https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008 | CC BY 4.0 (see the UCI page) | 100K inpatient encounters with a 30-day readmission outcome | Old data and coarse features. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE healthcare_contract_portfolio_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE healthcare_contract_portfolio_outputs (
  run_id TEXT NOT NULL REFERENCES healthcare_contract_portfolio_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE healthcare_contract_portfolio_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE healthcare_contract_portfolio_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Contract Portfolio Risk Prioritization": Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Dimension exposure scores | Normalised exposure for each risk dimension from verified inputs. The core components. | Leakage risk to design against: Input snapshots. |
| A signal-versus-noise trap in this use case: Dimensions | The true signal is legal, financial, compliance, supplier, continuity and renewal exposure kept separate; the common noise is one opaque score. | Different owners act on different dimensions. |

**Ask the experts**

- [ ] What exactly does "Risk owners set weights and approve escalations" mean in practice for healthcare contract portfolio risk prioritization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Dimension exposure scores" and "Dependency concentration", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "High-exposure agreements reviewed" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: hiding weights from owners, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing data for a dimension" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
