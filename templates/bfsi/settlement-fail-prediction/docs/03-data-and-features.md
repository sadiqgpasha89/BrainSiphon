# Settlement Fail Prediction: data and feature specification

> Generated from the blueprint `bfsi/settlement-fail-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Settlement Fail Prediction · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Settlement Fail Prediction": Predict which trades will fail to settle on the intended date so operations can chase the counterparty, borrow securities or fund early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using post-cut-off status.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Counterparty fail rate 30d | fails divided by trades in 30 days by counterparty and market | Strong repeat pattern | Window must end the previous day |   |   |   |
| Instrument liquidity | average daily volume and borrow availability | Illiquid securities fail more | Borrow data comes from lenders |   |   |   |
| Matching status | whether both sides' instructions have matched | Unmatched trades fail | Status snapshots must be as at 04:00 |   |   |   |
| Cut-off proximity | time between trade and the cut-off for the market | Late trades fail more | Time zones need care |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Timing | Features known before the settlement cut-off | Features including the actual instruction status after the fact | Post-event status leaks the label |
| Capacity | Ranking by expected loss within the chase capacity | Classification accuracy | Most trades settle, so accuracy hides ranking |
| Counterparty | Counterparty's own fail history by instrument type | Global counterparty rating | Fail behaviour differs by security type |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Trader name | arbitrary |
| Trade comment text | free text, inconsistent |
| Booking system id | arbitrary |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Counterparty fail rate 30d inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window must end the previous day. |
| Instrument liquidity inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: borrow data comes from lenders. |
| Matching status inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: status snapshots must be as at 04:00. |
| Cut-off proximity inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: time zones need care. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: settlement_fail_prediction_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: counterparty_fail_rate_30d, type: double, nullable: false }
    - { name: instrument_liquidity, type: double, nullable: false }
    - { name: matching_status, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Counterparty fail rate 30d and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Instrument liquidity against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Counterparty fail rate 30d, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE settlement_fail_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE settlement_fail_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES settlement_fail_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE settlement_fail_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE settlement_fail_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Settlement Fail Prediction": Predict which trades will fail to settle on the intended date so operations can chase the counterparty, borrow securities or fund early. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Capital markets operations: trade, settle, reconcile | After a trade is agreed it is confirmed, matched, allocated and settled, usually a day or two later, and the books of the bank, the custodian and the counterparty are reconciled. Fails, breaks and corporate actions create exceptions that operations teams chase against deadlines and penalties. | Operations capacity is the constraint, so models are judged on how well they rank exceptions within the number of items a team can handle. |
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Counterparty fail rate 30d | Fails divided by trades in 30 days by counterparty and market. Strong repeat pattern. | Leakage risk to design against: Window must end the previous day. |
| A signal-versus-noise trap in this use case: Timing | The true signal is features known before the settlement cut-off; the common noise is features including the actual instruction status after the fact. | Post-event status leaks the label. |

**Ask the experts**

- [ ] What exactly does "Predictions delivered by 04:00 for the settlement day" mean in practice for settlement fail prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Counterparty fail rate 30d" and "Instrument liquidity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fails avoided per day" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using post-cut-off status, and who can confirm the cut-off times and splits?
- [ ] How often does "Market holiday" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Settlement fail | A trade that does not settle on the intended date because securities or cash are not delivered. |
| CSD | Central securities depository: the institution that holds securities and settles trades in a market. |
| Corporate action | An event initiated by an issuer, such as a dividend, split or merger, that affects security holders. |
| LCR | Liquidity coverage ratio: high-quality liquid assets divided by expected 30-day stressed net outflows. |
| NSFR | Net stable funding ratio: available stable funding relative to required stable funding over a one-year horizon. |
| NII | Net interest income: interest earned on assets minus interest paid on liabilities. |
| Deposit beta | How much of a change in the policy rate the bank passes on to depositors. |
| Securities lending | Temporarily lending securities for a fee against collateral, often to short sellers. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
