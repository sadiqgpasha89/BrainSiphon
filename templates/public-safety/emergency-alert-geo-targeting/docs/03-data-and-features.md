# Emergency Alert Geo-Targeting: data and feature specification

> Generated from the blueprint `public-safety/emergency-alert-geo-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Emergency Alert Geo-Targeting · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Emergency Alert Geo-Targeting": Help alert authors draw alert areas that cover the hazard and people at risk without over-alerting, using hazard forecasts and population data. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Largest-area alerts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Hazard extent forecast | forecast footprint with uncertainty | Area | From hazard models |   |   |   |
| Population by cell | residents per area | Coverage | Aggregated |   |   |   |
| Cell tower coverage | service areas of towers | Delivery | From operators |   |   |   |
| Vulnerable community channels | languages and accessible channels | Reach | From registers |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Goal | Cover people at risk with minimal over-alerting | The largest area | Over-alerting causes alert fatigue |
| Control | An authorised officer sends | An automatic alert | Alerts carry legal and safety weight |
| Access | Multiple languages and formats | Text only | Many residents need other formats |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Officer name | irrelevant |
| Alert id | an identifier |
| Map colour | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Hazard extent forecast inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from hazard models. |
| Population by cell inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: aggregated. |
| Cell tower coverage inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from operators. |
| Vulnerable community channels inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from registers. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: emergency_alert_geo_targeting_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: hazard_extent_forecast, type: double, nullable: false }
    - { name: population_by_cell, type: double, nullable: false }
    - { name: cell_tower_coverage, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Hazard extent forecast and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Population by cell against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Hazard extent forecast, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE emergency_alert_geo_targeting_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  hazard_extent_forecast             DOUBLE PRECISION,
  population_by_cell                 DOUBLE PRECISION,
  cell_tower_coverage                DOUBLE PRECISION,
  vulnerable_community_channels      DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE emergency_alert_geo_targeting_decisions (
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
CREATE TABLE emergency_alert_geo_targeting_labels (
  decision_id    UUID        NOT NULL REFERENCES emergency_alert_geo_targeting_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Emergency Alert Geo-Targeting": Help alert authors draw alert areas that cover the hazard and people at risk without over-alerting, using hazard forecasts and population data. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Physical security uses sensors that create alerts | Cameras, access control and alarms generate many alerts, most of them benign. The task is to cut noise and surface events that need a human, such as an unattended item or a blocked exit. | Alert fatigue turns a good system into one that is switched off. |
| Dispatch is a resource allocation problem | Units differ in capability, position and availability, and demand is uneven across place and time. Good dispatch balances fast response with coverage for the next call. | Sending the nearest unit each time can leave an area uncovered, so coverage must be modelled. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Hazard extent forecast | Forecast footprint with uncertainty. Area. | Leakage risk to design against: From hazard models. |
| A signal-versus-noise trap in this use case: Goal | The true signal is cover people at risk with minimal over-alerting; the common noise is the largest area. | Over-alerting causes alert fatigue. |

**Ask the experts**

- [ ] What exactly does "The authorised officer approves every alert" mean in practice for emergency alert geo-targeting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Hazard extent forecast" and "Population by cell", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Alert area precision" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: largest-area alerts, and who can confirm the cut-off times and splits?
- [ ] How often does "Moving hazard" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Station coverage | How well stations can reach an area in the target time. |
| Early warning | An alert sent before a hazard arrives. |
| Cell broadcast | A message sent to all phones in an area. |
| Alert fatigue | When too many alerts cause people to ignore them. |
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| PSAP | Public safety answering point: the centre that answers emergency calls. |
| Call-taker | The person who answers an emergency call. |
| NG911 | Next-generation emergency calling over IP networks. |
| Hazard | A source of potential harm. |
| Flood extent | The area covered by floodwater. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| Modularity | A score for how well a division of the graph into groups separates dense communities. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| F1 score | The harmonic mean of precision and recall. |
