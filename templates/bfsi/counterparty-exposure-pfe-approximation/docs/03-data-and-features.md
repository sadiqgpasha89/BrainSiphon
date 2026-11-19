# Counterparty Exposure (PFE) Approximation with ML: data and feature specification

> Generated from the blueprint `bfsi/counterparty-exposure-pfe-approximation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Counterparty Exposure (PFE) Approximation with ML · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Counterparty Exposure (PFE) Approximation with ML": Approximate potential future exposure for trade-level pre-deal checks fast enough for traders, matching the full Monte Carlo engine within tolerance. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on calm periods.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Trade sensitivities | delta, vega and DV01 of the trade and the set | Drives exposure | Computed on the same curves |   |   |   |
| Market volatility level | implied volatility of the main risk factors | Drives the width of the distribution | Source differences |   |   |   |
| Netting set composition | notional by product and tenor | Describes diversification | Changes each day |   |   |   |
| Collateral terms | threshold and margin period of risk | Reduces exposure | Contract data quality |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Surrogate | A fast surrogate trained on the full engine outputs | Replacing the engine entirely | The engine remains the system of record |
| Tail | The 95th percentile profile over time | Expected exposure | Limits are set on the tail |
| Netting | Netting set structure | Trade by trade exposure | Netting can reduce exposure by orders of magnitude |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Trade booking time | irrelevant |
| Trader identifier | irrelevant |
| Counterparty name | already represented |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Trade sensitivities inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: computed on the same curves. |
| Market volatility level inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: source differences. |
| Netting set composition inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: changes each day. |
| Collateral terms inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: contract data quality. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: counterparty_exposure_pfe_approximation_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: trade_sensitivities, type: double, nullable: false }
    - { name: market_volatility_level, type: double, nullable: false }
    - { name: netting_set_composition, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Trade sensitivities and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Market volatility level against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Trade sensitivities, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jane Street Market Prediction | https://www.kaggle.com/c/jane-street-market-prediction | Competition rules; free Kaggle login | Anonymised market features with returns and a trade-or-not decision target | Anonymised and from one firm; check the data terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Inside Airbnb | https://insideairbnb.com/get-the-data/ | Creative Commons CC0 1.0 for most cities (check each city page) | Listing, calendar and review data for many cities, scraped from public Airbnb pages and refreshed regularly | Scraped, not official; calendar availability does not equal bookings and prices are asking prices. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Freddie Mac Single-Family Loan-Level Dataset | https://www.freddiemac.com/research/datasets/sf-loanlevel-dataset | Free with registration and acceptance of terms | Origination and monthly performance for millions of US mortgages, including prepayment and default status | Prime US agency loans only; registration required; no borrower-level free text or documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE counterparty_exposure_pfe_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  trade_sensitivities                DOUBLE PRECISION,
  market_volatility_level            DOUBLE PRECISION,
  netting_set_composition            DOUBLE PRECISION,
  collateral_terms                   DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE counterparty_exposure_pfe_decisions (
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
CREATE TABLE counterparty_exposure_pfe_labels (
  decision_id    UUID        NOT NULL REFERENCES counterparty_exposure_pfe_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Counterparty Exposure (PFE) Approximation with ML": Approximate potential future exposure for trade-level pre-deal checks fast enough for traders, matching the full Monte Carlo engine within tolerance. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Capital: risk-weighted assets and the capital ratio | Regulators require banks to hold capital against risk-weighted assets, where each exposure's weight depends on its type, rating and collateral. Reducing RWA by selling, hedging or restructuring frees capital but costs income, so the choice is a trade-off between capital use and return. | Optimisation models must use the regulatory definitions exactly, and a reduction that cannot be executed is not a reduction. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Capital markets operations: trade, settle, reconcile | After a trade is agreed it is confirmed, matched, allocated and settled, usually a day or two later, and the books of the bank, the custodian and the counterparty are reconciled. Fails, breaks and corporate actions create exceptions that operations teams chase against deadlines and penalties. | Operations capacity is the constraint, so models are judged on how well they rank exceptions within the number of items a team can handle. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Trade sensitivities | Delta, vega and DV01 of the trade and the set. Drives exposure. | Leakage risk to design against: Computed on the same curves. |
| A signal-versus-noise trap in this use case: Surrogate | The true signal is a fast surrogate trained on the full engine outputs; the common noise is replacing the engine entirely. | The engine remains the system of record. |

**Ask the experts**

- [ ] What exactly does "Approximation error within the risk-approved tolerance" mean in practice for counterparty exposure (pfe) approximation with ml: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Trade sensitivities" and "Market volatility level", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Pre-deal checks completed within 300 ms" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on calm periods, and who can confirm the cut-off times and splits?
- [ ] How often does "Exotic trade" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Netting set | A group of trades with one counterparty that can legally be offset against each other on default. |
| PFE | Potential future exposure: a high percentile of a counterparty's future exposure to the bank, used for limits. |
| Haircut | The percentage cut applied to an asset's market value when it is pledged as collateral. |
| Margin call | A demand for more collateral when exposure rises or collateral value falls. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
