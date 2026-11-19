# Digital Onboarding Drop-off Prediction & Intervention: data and feature specification

> Generated from the blueprint `fintech/digital-onboarding-dropoff-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Digital Onboarding Drop-off Prediction & Intervention · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Digital Onboarding Drop-off Prediction & Intervention": Predict mid-funnel abandonment during account opening and intervene (nudge, simplified step, assisted help) to lift completion. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Intervention data from non-random triggers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Step dwell time vs peers | z-score of dwell on current step | Confusion marker | Peer baseline per device type |   |   |   |
| Validation error count | form errors encountered on this step | Friction direct measure | Count before the nudge |   |   |   |
| Document capture retries | retries on ID photo | Quality friction | Retry source (device vs lighting) |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Intervention | Estimate uplift of each intervention | Predicting abandonment only | Some abandoners cannot be saved and some stay anyway |
| Friction | Step-level timing and error features | Page-view counts | The failing step is the signal, not the total pages |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Total session time | dominated by multitasking |
| Referrer URL | acquisition artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Step dwell time vs peers inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: peer baseline per device type. |
| Validation error count inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: count before the nudge. |
| Document capture retries inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: retry source (device vs lighting). |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: digital_onboarding_dropoff_prediction_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: step_dwell_time_vs_peers, type: double, nullable: false }
    - { name: validation_error_count, type: double, nullable: false }
    - { name: document_capture_retries, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Step dwell time vs peers and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Validation error count against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Step dwell time vs peers, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Avazu Click-Through Rate Prediction | https://www.kaggle.com/c/avazu-ctr-prediction | Competition rules; free Kaggle login | About 40 million mobile ad impressions over 10 days with hourly timestamps | No position or dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE digital_onboarding_dropoff_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  step_dwell_time_vs_peers           DOUBLE PRECISION,
  validation_error_count             DOUBLE PRECISION,
  document_capture_retries           DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE digital_onboarding_dropoff_decisions (
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
CREATE TABLE digital_onboarding_dropoff_labels (
  decision_id    UUID        NOT NULL REFERENCES digital_onboarding_dropoff_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Digital Onboarding Drop-off Prediction & Intervention": Predict mid-funnel abandonment during account opening and intervene (nudge, simplified step, assisted help) to lift completion. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Expected loss, provisioning and regulation | Lenders estimate probability of default (PD), loss given default (LGD) and exposure at default (EAD); expected loss is their product. Accounting rules such as IFRS 9 and CECL require provisions for expected losses over the life of a loan, and fair-lending laws restrict which features can drive decisions and require explanations for rejections. | Models are governed: they need monotonic, explainable behaviour, validation by an independent team and a documented reason for every adverse decision. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Step dwell time vs peers | Z-score of dwell on current step. Confusion marker. | Leakage risk to design against: Peer baseline per device type. |
| A signal-versus-noise trap in this use case: Intervention | The true signal is estimate uplift of each intervention; the common noise is predicting abandonment only. | Some abandoners cannot be saved and some stay anyway. |

**Ask the experts**

- [ ] What exactly does "No pressure tactics" mean in practice for digital onboarding drop-off prediction & intervention: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Step dwell time vs peers" and "Validation error count", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Completion rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: intervention data from non-random triggers, and who can confirm the cut-off times and splits?
- [ ] How often does "App release changes flow" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| KYC / CDD | Know your customer and customer due diligence: verifying identity and assessing risk when onboarding and during the relationship. |
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| Credit bureau | A company that collects borrowers' credit histories and sells reports and scores to lenders. |
| Thin file | A customer with little or no credit history, for whom bureau data say little. |
| Adverse action notice | A required explanation to an applicant who was declined or offered worse terms, listing the main reasons. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| Reject inference | Methods that estimate how declined applicants would have performed, to reduce selection bias in scorecards. |
| Scorecard | A points-based credit model, often built from binned features with monotonic weights, that regulators and underwriters can read. |
| Sharpe ratio | Excess return per unit of risk; a common but easily inflated measure of strategy quality. |
| Look-ahead bias | Using information in a backtest that would not have been available at decision time. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Level shift | An abrupt, lasting change in a series' average. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
