# Road Weather Hazard Alerting: data and feature specification

> Generated from the blueprint `public-safety/road-weather-hazard-alerting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Road Weather Hazard Alerting · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Road Weather Hazard Alerting": Forecast ice, flooding and low visibility on road segments from sensors and weather models and alert maintenance teams and drivers in time to treat or warn. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Air temperature as the only input.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pavement temperature forecast | predicted surface temperature | Ice risk | From models |   |   |   |
| Precipitation type and timing | rain, snow and freezing rain | Hazard | From radar |   |   |   |
| Surface moisture | wet or dry surface | Ice risk | From sensors |   |   |   |
| Visibility readings | fog and spray | Hazard | From sensors |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Truth | Road surface sensors and patrol reports | Air temperature alone | Pavement temperature differs |
| Action | Treatment and warning plans | A forecast | Teams need what to do and where |
| Reliability | Sensor health checks | Trusting every sensor | Sensors fail in winter |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Sensor name | an identifier |
| Operator name | irrelevant |
| Alert wording | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pavement temperature forecast inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from models. |
| Precipitation type and timing inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from radar. |
| Surface moisture inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from sensors. |
| Visibility readings inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from sensors. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: road_weather_hazard_alerting_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pavement_temperature_forecast, type: double, nullable: false }
    - { name: precipitation_type_and_timing, type: double, nullable: false }
    - { name: surface_moisture, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Pavement temperature forecast and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Precipitation type and timing against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pavement temperature forecast, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| NASA Prognostics Data Repository (C-MAPSS and others) | https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/ | Public NASA data (see the page) | Run-to-failure sensor data for engines and other components | Simulated or lab data; real fleets are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EdNet (Santa tutoring service) | https://github.com/riiid/ednet | CC BY-NC 4.0 per the repository | Interaction logs from more than 780,000 users over two years | Non-commercial licence and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE road_weather_hazard_alerting_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  pavement_temperature_forecast      DOUBLE PRECISION,
  precipitation_type_and_timing      DOUBLE PRECISION,
  surface_moisture                   DOUBLE PRECISION,
  visibility_readings                DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE road_weather_hazard_alerting_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE road_weather_hazard_alerting_labels (
  decision_id    UUID        NOT NULL REFERENCES road_weather_hazard_alerting_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Road Weather Hazard Alerting": Forecast ice, flooding and low visibility on road segments from sensors and weather models and alert maintenance teams and drivers in time to treat or warn. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Road safety depends on exposure and context | Crash risk depends on road design, speed, traffic, weather and user mix, and crashes are rare events. Analysis works at the location and segment level and avoids singling out drivers. | Targeting individuals from location history raises privacy and fairness concerns. |
| Disasters evolve and information is incomplete | Floods, fires and storms change by the hour while reports are partial and sometimes wrong. Responders need situational awareness that shows uncertainty and source reliability. | A confident map built on unverified reports can send crews to the wrong place. |
| Physical security uses sensors that create alerts | Cameras, access control and alarms generate many alerts, most of them benign. The task is to cut noise and surface events that need a human, such as an unattended item or a blocked exit. | Alert fatigue turns a good system into one that is switched off. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Pavement temperature forecast | Predicted surface temperature. Ice risk. | Leakage risk to design against: From models. |
| A signal-versus-noise trap in this use case: Truth | The true signal is road surface sensors and patrol reports; the common noise is air temperature alone. | Pavement temperature differs. |

**Ask the experts**

- [ ] What exactly does "Segment forecasts for the next 6 hours" mean in practice for road weather hazard alerting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pavement temperature forecast" and "Precipitation type and timing", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Ice-related crashes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: air temperature as the only input, and who can confirm the cut-off times and splits?
- [ ] How often does "Sensor outage" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Early warning | An alert sent before a hazard arrives. |
| Near miss | An event that almost caused a crash. |
| Hazard | A source of potential harm. |
| Cell broadcast | A message sent to all phones in an area. |
| Crash hotspot | A location with many crashes. |
| Black spot | A road location with a high crash record. |
| False alarm | An alert with no real incident. |
| Vision Zero | A strategy to eliminate road deaths and serious injuries. |
| Speed management | Setting and enforcing speeds to cut harm. |
| Alert fatigue | When too many alerts cause people to ignore them. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Exogenous variable | An input from outside the series, such as price or weather, used to explain it. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
