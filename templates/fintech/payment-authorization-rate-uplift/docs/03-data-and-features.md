# Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation): data and feature specification

> Generated from the blueprint `fintech/payment-authorization-rate-uplift` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation) · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation)": Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational retry data confounded by who was retried.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Decline code family | normalised scheme response code group | Determines retriability | Map codes per scheme and version |   |   |   |
| Time to payday proximity | days since typical salary credit for the segment | Funds-availability proxy | Compute from past cycles not future credits |   |   |   |
| Prior retry outcomes | success rate of previous retries for this BIN and code | Issuer-specific behaviour | Exclude the current retry chain |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Decline semantics | Decline reason code families mapped to retriable vs terminal | Treating all declines the same | Retrying a lost-card decline damages issuer trust |
| Timing | Optimal retry delay depends on reason (insufficient funds vs network) | Immediate blind retries | Immediate retry rarely changes the issuer's answer |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer email domain | no relation to authorisation outcome |
| Cart item names | high-dimensional, adds little over value and category |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Decline code family inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: map codes per scheme and version. |
| Time to payday proximity inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: compute from past cycles not future credits. |
| Prior retry outcomes inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: exclude the current retry chain. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: payment_authorization_rate_uplift_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: decline_code_family, type: double, nullable: false }
    - { name: time_to_payday_proximity, type: double, nullable: false }
    - { name: prior_retry_outcomes, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Decline code family and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Time to payday proximity against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Decline code family, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo AI Lab datasets | https://ailab.criteo.com/ressources/ | Research-use terms on the Criteo AI Lab page | Large click logs, uplift, attribution and counterfactual datasets from Criteo | Terabyte scale for some sets; research-use terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE payment_authorization_rate_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  decline_code_family                DOUBLE PRECISION,
  time_to_payday_proximity           DOUBLE PRECISION,
  prior_retry_outcomes               DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE payment_authorization_rate_decisions (
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
CREATE TABLE payment_authorization_rate_labels (
  decision_id    UUID        NOT NULL REFERENCES payment_authorization_rate_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation)": Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Decline code family | Normalised scheme response code group. Determines retriability. | Leakage risk to design against: Map codes per scheme and version. |
| A signal-versus-noise trap in this use case: Decline semantics | The true signal is decline reason code families mapped to retriable vs terminal; the common noise is treating all declines the same. | Retrying a lost-card decline damages issuer trust. |

**Ask the experts**

- [ ] What exactly does "Retry limits set by card schemes" mean in practice for payment authorization rate uplift (issuer-side retry & tokenisation): who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Decline code family" and "Time to payday proximity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Recovered revenue" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: observational retry data confounded by who was retried, and who can confirm the cut-off times and splits?
- [ ] How often does "Scheme rule change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Interchange | The fee that a merchant's bank pays the card issuer on each card transaction. |
| Payment routing | Choosing which processor or acquirer sends a transaction, to maximise approval and minimise cost. |
| Authorisation rate | The share of payment attempts that are approved, a key revenue metric for merchants. |
| Credit limit | The maximum balance a customer may carry on a revolving account. |
| BNPL | Buy now, pay later: short-term instalment credit offered at checkout, often with limited underwriting. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| Collections | The process of contacting customers who are behind on payments to recover money, within strict conduct rules. |
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| ISO 20022 | A global standard for financial messages with rich structured data used by modern payment systems. |
| FX spread | The margin a bank adds to the market exchange rate when converting currency. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
