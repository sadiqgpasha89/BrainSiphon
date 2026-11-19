# Insurance Underwriting & Risk Pricing: data and feature specification

> Generated from the blueprint `fintech/insurance-underwriting-risk-pricing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Insurance Underwriting & Risk Pricing · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Insurance Underwriting & Risk Pricing": Price policies at quote time so premiums match expected loss and competitor-aware conversion within regulatory rate rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Immature claims in training window.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Exposure-adjusted claim frequency | claims per policy-year by segment | Core pricing signal | Offset by earned exposure |   |   |   |
| Vehicle or property risk class | engineered class from make, model, construction | Severity driver | Use as-of rating tables |   |   |   |
| Telematics or sensor score | driving behaviour score from device | Behavioural risk | Consent and short observation windows |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Model form | Frequency times severity (or Tweedie) with exposure offsets | Classification of claim yes/no | Ignoring exposure biases pricing for part-year policies |
| Price | Loss cost plus demand elasticity optimisation | Charging pure risk premium | Pure-risk price ignores conversion and retention |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer first name | no risk information and proxy for demographics |
| Browser type | quote-funnel artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Exposure-adjusted claim frequency inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: offset by earned exposure. |
| Vehicle or property risk class inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use as-of rating tables. |
| Telematics or sensor score inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: consent and short observation windows. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: insurance_underwriting_risk_pricing_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: exposure_adjusted_claim_frequency, type: double, nullable: false }
    - { name: vehicle_or_property_risk_class, type: double, nullable: false }
    - { name: telematics_or_sensor_score, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Exposure-adjusted claim frequency and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Vehicle or property risk class against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Exposure-adjusted claim frequency, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| French Motor Third-Party Liability Claims | https://www.openml.org/d/41214 | Open licence on OpenML; see the dataset page | About 678,000 policies with exposure, claim counts and risk characteristics, the standard example for frequency modelling | One line of business in one country; no claim text, no payments over time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE insurance_underwriting_risk_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  exposure_adjusted_claim_frequency  DOUBLE PRECISION,
  vehicle_or_property_risk_class     DOUBLE PRECISION,
  telematics_or_sensor_score         DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE insurance_underwriting_risk_decisions (
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
CREATE TABLE insurance_underwriting_risk_labels (
  decision_id    UUID        NOT NULL REFERENCES insurance_underwriting_risk_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Insurance Underwriting & Risk Pricing": Price policies at quote time so premiums match expected loss and competitor-aware conversion within regulatory rate rules. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Exposure-adjusted claim frequency | Claims per policy-year by segment. Core pricing signal. | Leakage risk to design against: Offset by earned exposure. |
| A signal-versus-noise trap in this use case: Model form | The true signal is frequency times severity (or Tweedie) with exposure offsets; the common noise is classification of claim yes/no. | Ignoring exposure biases pricing for part-year policies. |

**Ask the experts**

- [ ] What exactly does "Rating factors must be filed with regulators" mean in practice for insurance underwriting & risk pricing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Exposure-adjusted claim frequency" and "Vehicle or property risk class", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Loss ratio by cohort" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: immature claims in training window, and who can confirm the cut-off times and splits?
- [ ] How often does "Claims development lag" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Premium | The price a policyholder pays for insurance cover. |
| Frequency / severity | How often claims occur and how large each one is; their product is expected loss. |
| Telematics | Data from vehicles or devices, such as speed and braking, used to price insurance by behaviour. |
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| Loss ratio | Claims paid divided by premium earned, a core measure of insurance profitability. |
| FNOL | First notice of loss: the first report of an insured event, where claims triage begins. |
| Subrogation | The insurer's right to recover claim payments from a party responsible for the loss. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| Reject inference | Methods that estimate how declined applicants would have performed, to reduce selection bias in scorecards. |
| Scorecard | A points-based credit model, often built from binned features with monotonic weights, that regulators and underwriters can read. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| F1 score | The harmonic mean of precision and recall. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
