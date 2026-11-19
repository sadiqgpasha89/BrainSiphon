# IFRS 9 Expected Credit Loss Staging: data and feature specification

> Generated from the blueprint `bfsi/ifrs9-ecl-stage-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IFRS 9 Expected Credit Loss Staging · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "IFRS 9 Expected Credit Loss Staging": Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split ignores economic cycles.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lifetime PD ratio | current lifetime PD divided by lifetime PD at origination | The standard relative test for stage 2 | The origination PD must be preserved, not re-estimated |   |   |   |
| Days past due flag | payment more than 30 days overdue | The backstop for stage 2 | Counted on contractual due dates, not posting dates |   |   |   |
| Watchlist and forbearance | internal flags for credit concern or concession | Qualitative indicators of increase | Flags must have effective dates to avoid leakage |   |   |   |
| Macro sensitivity | portfolio PD elasticity to unemployment and rates | Drives forward-looking adjustment | Sensitivities are estimated on few downturns |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Significant increase | Change in lifetime PD since origination, not the level of PD today | Staging by current PD alone | A high-risk loan priced at origination for that risk has not deteriorated |
| Stability | Hysteresis between stage 1 and 2 to avoid flip-flop | A single threshold evaluated monthly | Borrowers hovering near the cut-off swing provisions every month |
| Scenarios | Probability-weighted scenarios | A single baseline forecast | Non-linear loss makes the weighted result larger than the baseline result |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer tenure | weak link once behaviour is observed |
| Number of products | proxy for relationship, not for risk |
| Branch code | administrative noise |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lifetime PD ratio inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: the origination PD must be preserved, not re-estimated. |
| Days past due flag inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: counted on contractual due dates, not posting dates. |
| Watchlist and forbearance inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: flags must have effective dates to avoid leakage. |
| Macro sensitivity inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: sensitivities are estimated on few downturns. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ifrs9_ecl_stage_allocation_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lifetime_pd_ratio, type: double, nullable: false }
    - { name: days_past_due_flag, type: double, nullable: false }
    - { name: watchlist_and_forbearance, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Lifetime PD ratio and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Days past due flag against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lifetime PD ratio, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | A relational consumer-loan dataset (applications, bureau history, instalments) with a default label | Consumer instalment loans in emerging markets, not mortgages or corporate credit; competition licence limits reuse. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE ifrs9_ecl_stage_allocation_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE ifrs9_ecl_stage_allocation_outputs (
  run_id TEXT NOT NULL REFERENCES ifrs9_ecl_stage_allocation_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE ifrs9_ecl_stage_allocation_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE ifrs9_ecl_stage_allocation_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "IFRS 9 Expected Credit Loss Staging": Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Expected credit loss, IFRS 9 staging and provisions | Banks hold provisions against expected credit losses: twelve-month loss for performing loans (stage 1), lifetime loss once credit risk has increased significantly (stage 2) and for impaired loans (stage 3). Probability of default, loss given default and exposure at default are combined across scenarios, and a stage change can move provisions sharply. | A model that is slightly wrong near a stage boundary can move reported profit, so stability, hysteresis and explainability matter as much as discrimination. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Lifetime PD ratio | Current lifetime PD divided by lifetime PD at origination. The standard relative test for stage 2. | Leakage risk to design against: The origination PD must be preserved, not re-estimated. |
| A signal-versus-noise trap in this use case: Significant increase | The true signal is change in lifetime PD since origination, not the level of PD today; the common noise is staging by current PD alone. | A high-risk loan priced at origination for that risk has not deteriorated. |

**Ask the experts**

- [ ] What exactly does "Staging rules must be explainable to the auditor" mean in practice for ifrs 9 expected credit loss staging: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Lifetime PD ratio" and "Days past due flag", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Provision volatility relative to credit losses" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: random split ignores economic cycles, and who can confirm the cut-off times and splits?
- [ ] How often does "Model change at quarter end" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| PD, LGD, EAD | Probability of default, loss given default and exposure at default: the three inputs to expected credit loss. |
| IFRS 9 stage | The classification of a loan as performing (stage 1), significantly deteriorated (stage 2) or impaired (stage 3) that sets the provision horizon. |
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| Spreading | Entering a borrower's financial statements into standard lines so ratios can be compared across firms. |
| Deposit beta | How much of a change in the policy rate the bank passes on to depositors. |
| Persistency | The share of policies that stay in force over time; lapse is its opposite. |
| Treaty | A reinsurance contract covering a whole book of business rather than a single risk. |
| Catastrophe model | A simulation of hazard, exposure and vulnerability that estimates insured losses from events such as storms or earthquakes. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
