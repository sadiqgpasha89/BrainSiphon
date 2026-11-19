# Commercial Loan Covenant Breach Early Warning: data and feature specification

> Generated from the blueprint `bfsi/commercial-loan-covenant-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Loan Covenant Breach Early Warning · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Commercial Loan Covenant Breach Early Warning": Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using final accounts instead of as-reported ones inflates accuracy.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Covenant headroom and slope | current ratio minus threshold, plus 4-quarter linear trend | Shrinking headroom precedes breach | Use as-reported contractual definitions only |   |   |   |
| Revenue momentum | quarter-on-quarter revenue growth from management accounts | Earnings fall before ratios break | Management accounts arrive late and are sometimes restated |   |   |   |
| Liquidity cushion | undrawn committed lines plus cash divided by next-12-month debt service | Liquidity gaps push ratios | Facility availability must be as at the date, not current |   |   |   |
| Account behaviour | change in overdraft usage and payment timing on the bank's own accounts | The bank sees stress in cash movements early | Only valid for borrowers whose main account is held here |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Headroom | Distance to the covenant threshold and its trend | Level of leverage or coverage alone | A firm at 3.9x against a 4.0x limit is riskier than one at 4.5x against 6.0x |
| Reporting lag | Using the as-at date the figures were known to the bank | Using period-end dates for figures that arrived weeks later | Period-end dating leaks future information into training |
| Definitions | Covenant defined exactly as in the facility agreement, with adjustments | Standard EBITDA from a data vendor | Contractual EBITDA differs by add-backs and the breach test uses the contract |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Sector label alone | too coarse, a sector spans healthy and weak firms |
| Relationship age | weak link to near-term covenant stress |
| Number of facilities | mixes size and complexity, no causal link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Covenant headroom and slope inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use as-reported contractual definitions only. |
| Revenue momentum inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: management accounts arrive late and are sometimes restated. |
| Liquidity cushion inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: facility availability must be as at the date, not current. |
| Account behaviour inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: only valid for borrowers whose main account is held here. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: commercial_loan_covenant_early_warning_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: covenant_headroom_and_slope, type: double, nullable: false }
    - { name: revenue_momentum, type: double, nullable: false }
    - { name: liquidity_cushion, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Covenant headroom and slope and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Revenue momentum against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Covenant headroom and slope, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | A relational consumer-loan dataset (applications, bureau history, instalments) with a default label | Consumer instalment loans in emerging markets, not mortgages or corporate credit; competition licence limits reuse. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Freddie Mac Single-Family Loan-Level Dataset | https://www.freddiemac.com/research/datasets/sf-loanlevel-dataset | Free with registration and acceptance of terms | Origination and monthly performance for millions of US mortgages, including prepayment and default status | Prime US agency loans only; registration required; no borrower-level free text or documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE commercial_loan_covenant_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE commercial_loan_covenant_outputs (
  run_id TEXT NOT NULL REFERENCES commercial_loan_covenant_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE commercial_loan_covenant_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE commercial_loan_covenant_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Commercial Loan Covenant Breach Early Warning": Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a bank lends: origination, servicing and workout | A loan is originated (application, underwriting, approval, documents), serviced for years (payments, covenants, reviews) and, if the borrower struggles, moved to collections or workout. Each stage has its own data, owner and model: underwriting models see applicants, behaviour models see accounts, early-warning models see covenant and cash-flow signals. | Which stage you are modelling decides the label, the delay before you learn the outcome and which team acts on your score. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Covenant headroom and slope | Current ratio minus threshold, plus 4-quarter linear trend. Shrinking headroom precedes breach. | Leakage risk to design against: Use as-reported contractual definitions only. |
| A signal-versus-noise trap in this use case: Headroom | The true signal is distance to the covenant threshold and its trend; the common noise is level of leverage or coverage alone. | A firm at 3.9x against a 4.0x limit is riskier than one at 4.5x against 6.0x. |

**Ask the experts**

- [ ] What exactly does "Predictions explainable to credit officers line by line" mean in practice for commercial loan covenant breach early warning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Covenant headroom and slope" and "Revenue momentum", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Breaches caught at least one quarter early" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using final accounts instead of as-reported ones inflates accuracy, and who can confirm the cut-off times and splits?
- [ ] How often does "Waiver or amendment before breach" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| Spreading | Entering a borrower's financial statements into standard lines so ratios can be compared across firms. |
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| Intraday liquidity | The funds a bank needs during the day to make payments before incoming payments arrive. |
| Corporate action | An event initiated by an issuer, such as a dividend, split or merger, that affects security holders. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| LTV | Loan-to-value: the loan balance divided by the property value; a higher LTV means less equity cushion. |
| RAROC | Risk-adjusted return on capital: income minus costs and expected loss, divided by the capital held against the risk. |
| LCR | Liquidity coverage ratio: high-quality liquid assets divided by expected 30-day stressed net outflows. |
| Underwriting | Assessing a risk and deciding whether to accept it and at what price. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Stationarity | A series whose statistical properties do not change over time. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
