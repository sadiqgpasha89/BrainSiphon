# Solar Generation Forecasting: data and feature specification

> Generated from the blueprint `energy/solar-generation-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Solar Generation Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Solar Generation Forecasting": Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Nameplate capacity as truth.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Forecast irradiance | numerical weather model irradiance | Day-ahead driver | From the weather feed |   |   |   |
| Satellite cloud motion | cloud displacement from images | Nowcast driver | Computed from imagery |   |   |   |
| Plant availability | inverter and string outages | Capacity limit | From plant telemetry |   |   |   |
| Panel soiling and age | derating by soiling and age | Efficiency | From plant history |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Horizon | Different models for nowcast and day ahead | One model for all horizons | Cloud motion matters near term and weather models matter later |
| Capacity | Available capacity after curtailment and outages | Nameplate | Nameplate overstates what plants can deliver |
| Fleet | Aggregated rooftop estimates from sampled systems | Per-home forecasts | Individual homes are not needed and add privacy risk |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Plant owner name | irrelevant |
| Inverter serial | an identifier |
| Report format | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Forecast irradiance inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the weather feed. |
| Satellite cloud motion inputs | Asset management | Meter data management and billing (CIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: computed from imagery. |
| Plant availability inputs | Retail and customer operations | Asset management and GIS | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from plant telemetry. |
| Panel soiling and age inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from plant history. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: solar_generation_forecasting_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: forecast_irradiance, type: double, nullable: false }
    - { name: satellite_cloud_motion, type: double, nullable: false }
    - { name: plant_availability, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Forecast irradiance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Satellite cloud motion against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Forecast irradiance, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE solar_generation_forecasting_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE solar_generation_forecasting_detections (
  frame_id TEXT NOT NULL REFERENCES solar_generation_forecasting_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE solar_generation_forecasting_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Solar Generation Forecasting": Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Renewable output depends on weather | Solar and wind generation follow irradiance, cloud cover and wind speed, with ramps that are hard to predict. Forecast quality varies by site, season and horizon. | Probabilistic forecasts let operators size reserves, whereas point forecasts hide the risk. |
| Supply and demand must balance continuously | Electricity cannot be stored cheaply at scale, so generation, storage and demand response must match load in near real time. Forecast errors are paid for in reserves, imbalance charges or curtailment. | A forecast is judged by what its error costs the operator, not only by its average error. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Forecast irradiance | Numerical weather model irradiance. Day-ahead driver. | Leakage risk to design against: From the weather feed. |
| A signal-versus-noise trap in this use case: Horizon | The true signal is different models for nowcast and day ahead; the common noise is one model for all horizons. | Cloud motion matters near term and weather models matter later. |

**Ask the experts**

- [ ] What exactly does "Forecasts at 15-minute resolution up to 48 hours" mean in practice for solar generation forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Forecast irradiance" and "Satellite cloud motion", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Imbalance cost" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: nameplate capacity as truth, and who can confirm the cut-off times and splits?
- [ ] How often does "Fast cloud edge" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| DER | Distributed energy resources such as rooftop solar, batteries and electric vehicles. |
| Capacity factor | Actual output divided by maximum possible output. |
| DERMS | Distributed energy resource management system for rooftop solar, batteries and similar assets. |
| Spinning reserve | Generation capacity ready to respond quickly. |
| Imbalance settlement | Charges for the difference between scheduled and actual energy. |
| Smart inverter | A solar inverter that can support the grid. |
| Load forecast | A prediction of electricity demand. |
| Dispatch | Deciding which generators or batteries produce and when. |
| Curtailment | Reducing renewable output because the grid cannot take it. |
| Net metering | Crediting customers for energy they send to the grid. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Perceptual loss | A loss that compares images using the features of a pretrained network instead of raw pixels. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
