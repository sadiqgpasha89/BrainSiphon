# Collateral Valuation & Haircut Monitoring: data and feature specification

> Generated from the blueprint `bfsi/collateral-valuation-and-haircut-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Collateral Valuation & Haircut Monitoring · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Collateral Valuation & Haircut Monitoring": Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Back-test on calm markets misses stressed haircuts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Price momentum and volatility | 20-day return and realised volatility of the reference price | Rising volatility widens haircuts | Use settlement prices, not stale quotes |   |   |   |
| Liquidity proxy | traded volume and quoted spread over 30 days | Illiquid assets need larger haircuts | Volumes are missing for private assets |   |   |   |
| Valuation age | days since the last independent valuation | Stale values drift from reality | Ageing must use the valuation date, not the booking date |   |   |   |
| Concentration index | share of total pledged value in the same asset or region | Risk is non-linear in concentration | Group borrowers by common ownership first |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Downside | Tail quantile of recovery value | Mean valuation | The mean hides the loss given a stress sale |
| Liquidity | Time-to-sell and bid-ask for the asset class | Treating all collateral as liquid | Illiquid collateral loses value when it must be sold quickly |
| Concentration | Exposure to the same collateral type across borrowers | Valuing each loan separately | Correlated falls hit all loans at once |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Collateral description free text | inconsistent wording, replaced by coded types |
| Loan officer identifier | not related to collateral value |
| Original appraiser name | proxy for cohort, not value |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Price momentum and volatility inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use settlement prices, not stale quotes. |
| Liquidity proxy inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: volumes are missing for private assets. |
| Valuation age inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: ageing must use the valuation date, not the booking date. |
| Concentration index inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: group borrowers by common ownership first. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: collateral_valuation_and_haircut_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: price_momentum_and_volatility, type: double, nullable: false }
    - { name: liquidity_proxy, type: double, nullable: false }
    - { name: valuation_age, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Price momentum and volatility and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Liquidity proxy against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Price momentum and volatility, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| California Housing (scikit-learn) | https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_california_housing.html | BSD-3 code; census-derived data | 20,640 census block groups with median house value, income and location, loaded with one function call | Block-group medians from 1990, not individual homes; values are capped. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | A relational consumer-loan dataset (applications, bureau history, instalments) with a default label | Consumer instalment loans in emerging markets, not mortgages or corporate credit; competition licence limits reuse. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE collateral_valuation_and_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE collateral_valuation_and_outputs (
  run_id TEXT NOT NULL REFERENCES collateral_valuation_and_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE collateral_valuation_and_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE collateral_valuation_and_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Collateral Valuation & Haircut Monitoring": Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Capital markets operations: trade, settle, reconcile | After a trade is agreed it is confirmed, matched, allocated and settled, usually a day or two later, and the books of the bank, the custodian and the counterparty are reconciled. Fails, breaks and corporate actions create exceptions that operations teams chase against deadlines and penalties. | Operations capacity is the constraint, so models are judged on how well they rank exceptions within the number of items a team can handle. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| How a bank lends: origination, servicing and workout | A loan is originated (application, underwriting, approval, documents), serviced for years (payments, covenants, reviews) and, if the borrower struggles, moved to collections or workout. Each stage has its own data, owner and model: underwriting models see applicants, behaviour models see accounts, early-warning models see covenant and cash-flow signals. | Which stage you are modelling decides the label, the delay before you learn the outcome and which team acts on your score. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Price momentum and volatility | 20-day return and realised volatility of the reference price. Rising volatility widens haircuts. | Leakage risk to design against: Use settlement prices, not stale quotes. |
| A signal-versus-noise trap in this use case: Downside | The true signal is tail quantile of recovery value; the common noise is mean valuation. | The mean hides the loss given a stress sale. |

**Ask the experts**

- [ ] What exactly does "Daily revaluation before the margin cut-off" mean in practice for collateral valuation & haircut monitoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Price momentum and volatility" and "Liquidity proxy", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Under-secured exposure days" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: back-test on calm markets misses stressed haircuts, and who can confirm the cut-off times and splits?
- [ ] How often does "Price feed outage" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Haircut | The percentage cut applied to an asset's market value when it is pledged as collateral. |
| Margin call | A demand for more collateral when exposure rises or collateral value falls. |
| LTV | Loan-to-value: the loan balance divided by the property value; a higher LTV means less equity cushion. |
| Netting set | A group of trades with one counterparty that can legally be offset against each other on default. |
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| PD, LGD, EAD | Probability of default, loss given default and exposure at default: the three inputs to expected credit loss. |
| LCR | Liquidity coverage ratio: high-quality liquid assets divided by expected 30-day stressed net outflows. |
| Settlement fail | A trade that does not settle on the intended date because securities or cash are not delivered. |
| Securities lending | Temporarily lending securities for a fee against collateral, often to short sellers. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Distribution shift | A change in the data a model sees compared with training. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
