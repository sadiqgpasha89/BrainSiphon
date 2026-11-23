# Demand Response Targeting: data and feature specification

> Generated from the blueprint `energy/demand-response-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Demand Response Targeting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Demand Response Targeting": Choose which participating customers and sites to call during a peak event by estimated reduction per customer, so events deliver the needed load drop with the least inconvenience. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using total consumption as the target.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Past event response | measured reduction in earlier events | Core signal | Baseline adjusted |   |   |   |
| Load shape and flexible load | share of load that is shiftable | Potential | From interval data |   |   |   |
| Weather and event timing | temperature and event hour | Context | From forecasts |   |   |   |
| Fatigue count | events in the last weeks | Constraint | From programme records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Effect | Estimated load reduction compared with a counterfactual baseline | Total consumption | High users do not always shift load |
| Consent | Opt-in customers and their stated limits | Any customer | Unwanted events harm trust |
| Fairness | Rotation and fatigue limits | The same customers every time | Repeated calls drive opt-outs |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Marketing segment alone | weak link |
| Device brand | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Past event response inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: baseline adjusted. |
| Load shape and flexible load inputs | Asset management | Meter data management and billing (CIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from interval data. |
| Weather and event timing inputs | Retail and customer operations | Asset management and GIS | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from forecasts. |
| Fatigue count inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from programme records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: demand_response_targeting_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: past_event_response, type: double, nullable: false }
    - { name: load_shape_and_flexible_load, type: double, nullable: false }
    - { name: weather_and_event_timing, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Past event response and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Load shape and flexible load against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Past event response, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NYC Taxi and Limousine Commission trip records (AWS Open Data) | https://registry.opendata.aws/nyc-tlc-trip-records-pds/ | Open data (see the registry page) | Hundreds of millions of trip records with pickup and drop-off times, locations and fares | One city; no driver identities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo AI Lab datasets | https://ailab.criteo.com/ressources/ | Research-use terms on the Criteo AI Lab page | Large click logs, uplift, attribution and counterfactual datasets from Criteo | Terabyte scale for some sets; research-use terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE demand_response_targeting_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE demand_response_targeting_outputs (
  run_id TEXT NOT NULL REFERENCES demand_response_targeting_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE demand_response_targeting_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE demand_response_targeting_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Demand Response Targeting": Choose which participating customers and sites to call during a peak event by estimated reduction per customer, so events deliver the needed load drop with the least inconvenience. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Supply and demand must balance continuously | Electricity cannot be stored cheaply at scale, so generation, storage and demand response must match load in near real time. Forecast errors are paid for in reserves, imbalance charges or curtailment. | A forecast is judged by what its error costs the operator, not only by its average error. |
| Renewable output depends on weather | Solar and wind generation follow irradiance, cloud cover and wind speed, with ramps that are hard to predict. Forecast quality varies by site, season and horizon. | Probabilistic forecasts let operators size reserves, whereas point forecasts hide the risk. |
| Smart meters produce large volumes of interval data | Meters report consumption at short intervals, which supports billing, loss detection and demand analytics but raises privacy concerns because the pattern reveals household behaviour. | Analytics should use aggregation and access controls and avoid inferring sensitive household behaviour. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Past event response | Measured reduction in earlier events. Core signal. | Leakage risk to design against: Baseline adjusted. |
| A signal-versus-noise trap in this use case: Effect | The true signal is estimated load reduction compared with a counterfactual baseline; the common noise is total consumption. | High users do not always shift load. |

**Ask the experts**

- [ ] What exactly does "Only customers who opted in" mean in practice for demand response targeting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Past event response" and "Load shape and flexible load", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Delivered reduction" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using total consumption as the target, and who can confirm the cut-off times and splits?
- [ ] How often does "Baseline error" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Demand response | Paying or asking customers to shift or cut use at peak times. |
| Load forecast | A prediction of electricity demand. |
| Peak demand | The highest demand in a period. |
| Time-of-use tariff | A price that depends on the time of day. |
| Spinning reserve | Generation capacity ready to respond quickly. |
| Imbalance settlement | Charges for the difference between scheduled and actual energy. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Distribution shift | A change in the data a model sees compared with training. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
