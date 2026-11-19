# Earnings-Call Sentiment & ESG Signal Extraction: data and feature specification

> Generated from the blueprint `fintech/earnings-call-sentiment-and-esg-signals` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Earnings-Call Sentiment & ESG Signal Extraction · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Earnings-Call Sentiment & ESG Signal Extraction": Convert filings, calls and news into structured, point-in-time signals for research analysts and quant models. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Date-level joins instead of timestamp.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Guidance language change | diff of forward-looking statements vs prior call | Early info on outlook | Align quarters correctly |   |   |   |
| Q&A evasiveness score | non-answer rate in analyst Q&A | Management caution | Speaker diarisation must be accurate |   |   |   |
| Topic emphasis shift | change in share of text on risk topics | ESG risk emphasis | Topic model frozen per version |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Delta | Change in language versus prior quarters (new hedging, dropped guidance) | Absolute sentiment score | Absolute sentiment is dominated by sector tone |
| Timing | Signal available only after publication timestamp | Date-level joins | Date joins leak intraday content into earlier returns |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Overall positivity | boilerplate optimism by management |
| Transcript length | varies with company style |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Guidance language change inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: align quarters correctly. |
| Q&A evasiveness score inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: speaker diarisation must be accurate. |
| Topic emphasis shift inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: topic model frozen per version. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: earnings_call_sentiment_and_esg_signals_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: guidance_language_change, type: double, nullable: false }
    - { name: q_a_evasiveness_score, type: double, nullable: false }
    - { name: topic_emphasis_shift, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Guidance language change and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Q&A evasiveness score against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Guidance language change, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FinancialPhraseBank | https://huggingface.co/datasets/takala/financial_phrasebank | CC BY-NC-SA 3.0 (see the page) | About 4,800 financial news sentences labelled positive, neutral or negative | Small and sentence-level; limited to financial news. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Customer Support on Twitter | https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter | See the dataset page; free Kaggle login | About 3 million tweets and replies between customers and company support accounts | Public social posts; informal language. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE earnings_call_sentiment_and_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE earnings_call_sentiment_and_fields (
  document_id TEXT NOT NULL REFERENCES earnings_call_sentiment_and_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE earnings_call_sentiment_and_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Earnings-Call Sentiment & ESG Signal Extraction": Convert filings, calls and news into structured, point-in-time signals for research analysts and quant models. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Guidance language change | Diff of forward-looking statements vs prior call. Early info on outlook. | Leakage risk to design against: Align quarters correctly. |
| A signal-versus-noise trap in this use case: Delta | The true signal is change in language versus prior quarters (new hedging, dropped guidance); the common noise is absolute sentiment score. | Absolute sentiment is dominated by sector tone. |

**Ask the experts**

- [ ] What exactly does "Timestamp accuracy to the second" mean in practice for earnings-call sentiment & esg signal extraction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Guidance language change" and "Q&A evasiveness score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Analyst usage" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: date-level joins instead of timestamp, and who can confirm the cut-off times and splits?
- [ ] How often does "Transcript corrected hours later" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Sharpe ratio | Excess return per unit of risk; a common but easily inflated measure of strategy quality. |
| Alpha | Return that is not explained by exposure to broad market factors; what a signal is trying to find. |
| Look-ahead bias | Using information in a backtest that would not have been available at decision time. |
| Survivorship bias | Testing only on assets that still exist today, which hides those that failed. |
| ISO 20022 | A global standard for financial messages with rich structured data used by modern payment systems. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Paraphrase robustness | A model giving the same answer to differently worded versions of the same text. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
