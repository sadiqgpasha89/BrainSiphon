# Dispatch Unit Recommendation: data and feature specification

> Generated from the blueprint `public-safety/dispatch-unit-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dispatch Unit Recommendation · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Dispatch Unit Recommendation": Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automatic assignment.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Estimated travel time | predicted arrival time | Core | From the routing engine |   |   |   |
| Unit capability | skills and equipment | Constraint | From the register |   |   |   |
| Coverage impact | effect on zone coverage | Trade-off | From the coverage model |   |   |   |
| Unit status reliability | how reliable the status is | Risk | From telemetry |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Goal | Fast arrival with coverage kept | Closest unit always | The closest unit may leave an area uncovered |
| Rules | Jurisdiction and capability as hard rules | Learned preferences | Wrong crews waste minutes |
| Control | Dispatcher accept or override | Automatic assignment | Dispatch carries accountability |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Dispatcher name | irrelevant |
| Crew name | irrelevant |
| Call text wording | not routing |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Estimated travel time inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from the routing engine. |
| Unit capability inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the register. |
| Coverage impact inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from the coverage model. |
| Unit status reliability inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from telemetry. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: dispatch_unit_recommendation_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: estimated_travel_time, type: double, nullable: false }
    - { name: unit_capability, type: double, nullable: false }
    - { name: coverage_impact, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Estimated travel time and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Unit capability against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Estimated travel time, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Instacart Market Basket Analysis | https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis | Competition rules; free Kaggle login | 3 million grocery orders from 200K users with reorder labels | No timestamps beyond day-of-week and hour; US grocery only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE dispatch_unit_recommendation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  estimated_travel_time              DOUBLE PRECISION,
  unit_capability                    DOUBLE PRECISION,
  coverage_impact                    DOUBLE PRECISION,
  unit_status_reliability            DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE dispatch_unit_recommendation_decisions (
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
CREATE TABLE dispatch_unit_recommendation_labels (
  decision_id    UUID        NOT NULL REFERENCES dispatch_unit_recommendation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Dispatch Unit Recommendation": Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Dispatch is a resource allocation problem | Units differ in capability, position and availability, and demand is uneven across place and time. Good dispatch balances fast response with coverage for the next call. | Sending the nearest unit each time can leave an area uncovered, so coverage must be modelled. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Estimated travel time | Predicted arrival time. Core. | Leakage risk to design against: From the routing engine. |
| A signal-versus-noise trap in this use case: Goal | The true signal is fast arrival with coverage kept; the common noise is closest unit always. | The closest unit may leave an area uncovered. |

**Ask the experts**

- [ ] What exactly does "Recommendation within 100 ms" mean in practice for dispatch unit recommendation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Estimated travel time" and "Unit capability", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to assignment" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: automatic assignment, and who can confirm the cut-off times and splits?
- [ ] How often does "Stale unit status" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| Unit | A vehicle or team available for dispatch. |
| Response time | The time from call to arrival of help. |
| Station coverage | How well stations can reach an area in the target time. |
| Dispatch protocol | A scripted set of questions that decides the response level. |
| Algorithmic impact assessment | A review of the effects of an automated system. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
