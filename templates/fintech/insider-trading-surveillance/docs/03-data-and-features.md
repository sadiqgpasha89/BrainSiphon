# Insider Trading & Market Abuse Surveillance: data and feature specification

> Generated from the blueprint `fintech/insider-trading-surveillance` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Insider Trading & Market Abuse Surveillance · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Insider Trading & Market Abuse Surveillance": Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Enforcement cases are a tiny biased positive set.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pre-announcement abnormal return | cumulative abnormal return relative to a market model | Informed trading shows before news | Event dates must be public timestamps |   |   |   |
| Position change vs baseline | deviation from the trader's historical position in the name | Unusual conviction | Baseline excludes the window |   |   |   |
| Communication proximity | graph distance and message volume to insiders | Information channel | Respect chinese-wall data scoping |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Timing | Abnormal returns and positioning in the window before announcements | Absolute trade size | Large benign trades are common; timing relative to news is the signal |
| Linkage | Communications or relationship links between trader and insider | Trade pattern alone | Without links, many alerts are coincidence |

## Features to drop

| Feature | Why it is noise |
|---|---|
| P&L of the trade | outcome-based, not the cause |
| Number of trades per day | dominated by market makers |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pre-announcement abnormal return inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event dates must be public timestamps. |
| Position change vs baseline inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: baseline excludes the window. |
| Communication proximity inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: respect chinese-wall data scoping. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: insider_trading_surveillance_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pre_announcement_abnormal_return, type: double, nullable: false }
    - { name: position_change_vs_baseline, type: double, nullable: false }
    - { name: communication_proximity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Pre-announcement abnormal return and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Position change vs baseline against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pre-announcement abnormal return, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FinancialPhraseBank | https://huggingface.co/datasets/takala/financial_phrasebank | CC BY-NC-SA 3.0 (see the page) | About 4,800 financial news sentences labelled positive, neutral or negative | Small and sentence-level; limited to financial news. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE insider_trading_surveillance_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE insider_trading_surveillance_fields (
  document_id TEXT NOT NULL REFERENCES insider_trading_surveillance_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE insider_trading_surveillance_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Insider Trading & Market Abuse Surveillance": Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Anti-money-laundering and know-your-customer | Banks must verify who customers are (KYC), monitor transactions for patterns such as structuring and layering, screen names against sanctions and politically exposed person lists, and file suspicious activity reports with regulators within deadlines. Monitoring generates alerts that investigators review; most are false. | The cost of an alert is analyst time and the cost of a miss is regulatory penalty, so evaluation uses alert-to-report ratios and investigator capacity, not accuracy. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Pre-announcement abnormal return | Cumulative abnormal return relative to a market model. Informed trading shows before news. | Leakage risk to design against: Event dates must be public timestamps. |
| A signal-versus-noise trap in this use case: Timing | The true signal is abnormal returns and positioning in the window before announcements; the common noise is absolute trade size. | Large benign trades are common; timing relative to news is the signal. |

**Ask the experts**

- [ ] What exactly does "Records retention per MiFID II / SEC rules" mean in practice for insider trading & market abuse surveillance: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pre-announcement abnormal return" and "Position change vs baseline", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Alerts per confirmed case" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: enforcement cases are a tiny biased positive set, and who can confirm the cut-off times and splits?
- [ ] How often does "Earnings season floods alerts" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Spoofing | Placing orders with no intention to execute them to mislead other traders, a form of market abuse. |
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Bid-ask spread | The difference between the highest price buyers offer and the lowest price sellers ask; a cost of trading. |
| Market making | Quoting both buy and sell prices continuously to earn the spread while managing inventory risk. |
| Inventory risk | The risk a market maker carries from holding a position whose price may move against it. |
| Market regime | A period with distinct statistical behaviour, such as calm, trending or crisis conditions. |
| Sharpe ratio | Excess return per unit of risk; a common but easily inflated measure of strategy quality. |
| Look-ahead bias | Using information in a backtest that would not have been available at decision time. |
| Survivorship bias | Testing only on assets that still exist today, which hides those that failed. |
| Alpha | Return that is not explained by exposure to broad market factors; what a signal is trying to find. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
