# Building Energy Benchmarking & Retrofit Targeting: data and feature specification

> Generated from the blueprint `real-estate/building-energy-benchmarking-and-retrofit-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Building Energy Benchmarking & Retrofit Targeting · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Building Energy Benchmarking & Retrofit Targeting": Benchmark building energy use against peers and rank buildings for retrofit by savings and payback. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Retrofitted buildings differ from the rest, so their results are not comparable with unretrofitted ones.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Normalised EUI | annual kilowatt-hours per square metre after weather and occupancy adjustment | The core efficiency measure | Area definitions differ, so use the standard gross internal area |   |   |   |
| Peer percentile | rank of the building's normalised EUI within its peer group | Shows how far from typical the building is | Peer groups with few members are unstable |   |   |   |
| Envelope age | year of construction and of the last major facade or window upgrade | Older envelopes lose more heat | Records are often missing, so use the building age as a fallback |   |   |   |
| System type | heating and cooling system class, such as gas boiler, heat pump or chiller | Systems drive both use and retrofit options | Recorded types are often outdated |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Normalise | Energy use normalised for weather, area and occupancy | Raw kilowatt-hours | A cold winter or a larger floor area makes a building look worse without any change in efficiency |
| Peers | Peer groups by use type, size and climate zone | A national average for all buildings | A hospital and an office have different loads, so a national peer makes one look good and the other bad |
| Savings | Savings potential and payback of each retrofit option | The level of use alone | A high-use building may have no cheap fix, and a modest one may have a quick payback |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Building name | A label that does not describe efficiency |
| Owner | The owner identity does not change the physical performance |
| Photo | Appearance has little relation to energy use |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Normalised EUI inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: area definitions differ, so use the standard gross internal area. |
| Peer percentile inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: peer groups with few members are unstable. |
| Envelope age inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: records are often missing, so use the building age as a fallback. |
| System type inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: recorded types are often outdated. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: building_energy_benchmarking_and_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: normalised_eui, type: double, nullable: false }
    - { name: peer_percentile, type: double, nullable: false }
    - { name: envelope_age, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Normalised EUI and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Peer percentile against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Normalised EUI, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| California Housing (scikit-learn) | https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_california_housing.html | BSD-3 code; census-derived data | 20,640 census block groups with median house value, income and location, loaded with one function call | Block-group medians from 1990, not individual homes; values are capped. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE building_energy_benchmarking_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE building_energy_benchmarking_outputs (
  run_id TEXT NOT NULL REFERENCES building_energy_benchmarking_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE building_energy_benchmarking_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE building_energy_benchmarking_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Building Energy Benchmarking & Retrofit Targeting": Benchmark building energy use against peers and rank buildings for retrofit by savings and payback. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Normalised EUI | Annual kilowatt-hours per square metre after weather and occupancy adjustment. The core efficiency measure. | Leakage risk to design against: Area definitions differ, so use the standard gross internal area. |
| A signal-versus-noise trap in this use case: Normalise | The true signal is energy use normalised for weather, area and occupancy; the common noise is raw kilowatt-hours. | A cold winter or a larger floor area makes a building look worse without any change in efficiency. |

**Ask the experts**

- [ ] What exactly does "Energy use normalised for weather and occupancy before any comparison" mean in practice for building energy benchmarking & retrofit targeting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Normalised EUI" and "Peer percentile", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Retrofits delivered" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: retrofitted buildings differ from the rest, so their results are not comparable with unretrofitted ones, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing meters" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| EUI | Energy use intensity: energy used per unit of floor area per year. |
| BMS | Building management system: the control system that runs heating, cooling, lighting and sensors in a building. |
| Fair housing | Laws prohibiting discrimination in selling, renting, advertising and financing housing. |
| Setpoint | The target temperature or other value a control system tries to maintain. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Cap-ex | Capital expenditure on improving or replacing building components, as distinct from routine repairs. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Distribution shift | A change in the data a model sees compared with training. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
