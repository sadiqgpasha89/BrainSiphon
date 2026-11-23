# Tariff Recommendation: data and feature specification

> Generated from the blueprint `energy/tariff-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tariff Recommendation · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Tariff Recommendation": Recommend the tariff that would have cost each customer the least on their own usage, and tell them how confident the saving is, so plans fit how people actually use energy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Typical household assumptions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Replayed annual cost | cost of past usage under each tariff | Core signal | From interval data |   |   |   |
| Usage shape stability | how much the pattern varies by year | Reliability | From history |   |   |   |
| Planned changes | solar, EV or heat pump plans | Future shape | From the customer |   |   |   |
| Tariff eligibility | which plans the customer can take | Feasibility | From rules |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Basis | The customer's actual usage replayed under each tariff | An average household | Usage shapes differ widely |
| Honesty | The cheapest plan with the range of savings | The highest margin plan | Misleading advice breaks regulation and trust |
| Risk | Sensitivity to future usage changes | One estimate | A plan that wins only on past use may lose next year |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Marketing segment | weak link |
| Home size alone | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Replayed annual cost inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from interval data. |
| Usage shape stability inputs | Asset management | Meter data management and billing (CIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from history. |
| Planned changes inputs | Retail and customer operations | Asset management and GIS | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the customer. |
| Tariff eligibility inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from rules. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: tariff_recommendation_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: replayed_annual_cost, type: double, nullable: false }
    - { name: usage_shape_stability, type: double, nullable: false }
    - { name: planned_changes, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Replayed annual cost and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Usage shape stability against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Replayed annual cost, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Instacart Market Basket Analysis | https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis | Competition rules; free Kaggle login | 3 million grocery orders from 200K users with reorder labels | No timestamps beyond day-of-week and hour; US grocery only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE tariff_recommendation_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE tariff_recommendation_outputs (
  run_id TEXT NOT NULL REFERENCES tariff_recommendation_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE tariff_recommendation_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE tariff_recommendation_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Tariff Recommendation": Recommend the tariff that would have cost each customer the least on their own usage, and tell them how confident the saving is, so plans fit how people actually use energy. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Smart meters produce large volumes of interval data | Meters report consumption at short intervals, which supports billing, loss detection and demand analytics but raises privacy concerns because the pattern reveals household behaviour. | Analytics should use aggregation and access controls and avoid inferring sensitive household behaviour. |
| Renewable output depends on weather | Solar and wind generation follow irradiance, cloud cover and wind speed, with ramps that are hard to predict. Forecast quality varies by site, season and horizon. | Probabilistic forecasts let operators size reserves, whereas point forecasts hide the risk. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Replayed annual cost | Cost of past usage under each tariff. Core signal. | Leakage risk to design against: From interval data. |
| A signal-versus-noise trap in this use case: Basis | The true signal is the customer's actual usage replayed under each tariff; the common noise is an average household. | Usage shapes differ widely. |

**Ask the experts**

- [ ] What exactly does "Recommendation based on the customer's own usage and consent" mean in practice for tariff recommendation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Replayed annual cost" and "Usage shape stability", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Customer savings realised" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: typical household assumptions, and who can confirm the cut-off times and splits?
- [ ] How often does "Short history" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| SAIDI | System average interruption duration index: average outage minutes per customer. |
| SAIFI | System average interruption frequency index: average number of outages per customer. |
| Demand response | Paying or asking customers to shift or cut use at peak times. |
| Time-of-use tariff | A price that depends on the time of day. |
| Reliability standard | Rules set by a regulator for network reliability. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
