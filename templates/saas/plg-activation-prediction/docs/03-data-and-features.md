# Product-Led Growth Activation Prediction: data and feature specification

> Generated from the blueprint `saas/plg-activation-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Product-Led Growth Activation Prediction · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Product-Led Growth Activation Prediction": Predict which new signups will activate and convert to paid, and trigger in-product guidance or sales assist for those on the edge. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Non-random nudge assignments in training.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Key-action completion in first session | whether the aha action occurred | Activation | Event definitions |   |   |   |
| Time-to-first-value | minutes to first key action | Friction | Timing |   |   |   |
| Team invitations sent | collaborators invited | Network value | Event |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Activation | Define activation by a leading action tied to retention | Signup counts | Signups without value moments never convert |
| Nudges | Uplift per nudge type | Nudging everyone | Nudges annoy users who would have activated |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Signup source text | channel artefact |
| Browser | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Key-action completion in first session inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: event definitions. |
| Time-to-first-value inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: timing. |
| Team invitations sent inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: event. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: plg_activation_prediction_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: key_action_completion_in_first_session, type: double, nullable: false }
    - { name: time_to_first_value, type: double, nullable: false }
    - { name: team_invitations_sent, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Key-action completion in first session and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Time-to-first-value against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Key-action completion in first session, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE plg_activation_prediction_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  key_action_completion_in_first_session DOUBLE PRECISION,
  time_to_first_value                DOUBLE PRECISION,
  team_invitations_sent              DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE plg_activation_prediction_decisions (
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
CREATE TABLE plg_activation_prediction_labels (
  decision_id    UUID        NOT NULL REFERENCES plg_activation_prediction_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Product-Led Growth Activation Prediction": Predict which new signups will activate and convert to paid, and trigger in-product guidance or sales assist for those on the edge. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| B2B SaaS metrics and the customer lifecycle | Software-as-a-service companies sell subscriptions to businesses. Key quantities are annual recurring revenue (ARR), net revenue retention, churn, expansion and the sales pipeline. Customers move from lead to account, trial, activation, expansion and renewal, with product usage as the leading signal. | Targets like churn and expansion are slow and censored (many accounts have not renewed yet), so models need survival-style handling and care about leakage from billing events. |
| Product-led growth, pricing and experimentation | Many products grow by letting users try before they buy. Activation (reaching first value), usage depth and team spread predict conversion; pricing and packaging decide who pays for what. A/B tests with few accounts and long horizons need variance reduction and sequential methods. | Underpowered experiments and peeking produce false wins, so experimentation platforms enforce rules about duration and metrics. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Key-action completion in first session | Whether the aha action occurred. Activation. | Leakage risk to design against: Event definitions. |
| A signal-versus-noise trap in this use case: Activation | The true signal is define activation by a leading action tied to retention; the common noise is signup counts. | Signups without value moments never convert. |

**Ask the experts**

- [ ] What exactly does "Real-time within sessions" mean in practice for product-led growth activation prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Key-action completion in first session" and "Time-to-first-value", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Activation rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: non-random nudge assignments in training, and who can confirm the cut-off times and splits?
- [ ] How often does "Instrumentation change breaks the activation event" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| PQL / MQL | Product-qualified and marketing-qualified leads: prospects identified from product usage or marketing activity. |
| Activation | A user reaching the first moment of real value in a product. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| Sequential testing | Statistical methods that allow results to be checked repeatedly without inflating false positives. |
| In-app copilot | An assistant inside a product that answers questions and can take actions on the user's behalf. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Lag feature | A past value of the series used as a predictor. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
