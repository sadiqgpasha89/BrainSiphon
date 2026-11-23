# Retail Energy Churn Prediction: data and feature specification

> Generated from the blueprint `energy/retail-energy-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Retail Energy Churn Prediction · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Retail Energy Churn Prediction": Predict which retail energy customers are likely to switch supplier in the coming months so the retention team can offer a fair, relevant plan. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Targeting loyal customers with worse prices.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Price gap to the best market offer | difference between current and best available price | Switch motive | From market data |   |   |   |
| Contract end date | days until the fixed term ends | Timing | From contracts |   |   |   |
| Contact and complaint history | recent complaints and contacts | Dissatisfaction | From CRM |   |   |   |
| Bill shock events | recent unusually high bills | Trigger | From billing |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Customers who left after the contract ended or switched mid-term | Calls to cancel | Many callers stay |
| Fairness | Equal access to the best plans | Better prices only for those about to leave | Loyal customers should not pay more |
| Timing | Features known before the switch decision | Data from after the switch | Leakage inflates results |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Marketing channel alone | weak link |
| Postcode text | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Price gap to the best market offer inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from market data. |
| Contract end date inputs | Asset management | Meter data management and billing (CIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from contracts. |
| Contact and complaint history inputs | Retail and customer operations | Asset management and GIS | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from CRM. |
| Bill shock events inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from billing. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: retail_energy_churn_prediction_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: price_gap_to_the_best_market_offer, type: double, nullable: false }
    - { name: contract_end_date, type: double, nullable: false }
    - { name: contact_and_complaint_history, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Price gap to the best market offer and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Contract end date against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Price gap to the best market offer, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE retail_energy_churn_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE retail_energy_churn_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES retail_energy_churn_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE retail_energy_churn_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE retail_energy_churn_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Retail Energy Churn Prediction": Predict which retail energy customers are likely to switch supplier in the coming months so the retention team can offer a fair, relevant plan. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Smart meters produce large volumes of interval data | Meters report consumption at short intervals, which supports billing, loss detection and demand analytics but raises privacy concerns because the pattern reveals household behaviour. | Analytics should use aggregation and access controls and avoid inferring sensitive household behaviour. |
| Assets age and fail in the field | Transformers, cables, poles, pipes and pumps degrade with load, weather and time, and inspection data is sparse. Failures cause outages, safety incidents and environmental harm. | Asset health models must support the decision to inspect, repair or replace, within a safety-first culture. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Price gap to the best market offer | Difference between current and best available price. Switch motive. | Leakage risk to design against: From market data. |
| A signal-versus-noise trap in this use case: Label | The true signal is customers who left after the contract ended or switched mid-term; the common noise is calls to cancel. | Many callers stay. |

**Ask the experts**

- [ ] What exactly does "Churn probability for the next 90 days" mean in practice for retail energy churn prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Price gap to the best market offer" and "Contract end date", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Retention rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: targeting loyal customers with worse prices, and who can confirm the cut-off times and splits?
- [ ] How often does "Market price drop" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Load forecast | A prediction of electricity demand. |
| Pipe burst | A sudden failure of a water or gas pipe. |
| Leak detection | Finding losses in water or gas networks. |
| Time-of-use tariff | A price that depends on the time of day. |
| Reliability standard | Rules set by a regulator for network reliability. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Lag feature | A past value of the series used as a predictor. |
| Remaining useful life | The estimated time before a machine or component fails. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
