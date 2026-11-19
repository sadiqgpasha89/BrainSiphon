# Sanctions Name Screening with Fuzzy Matching: data and feature specification

> Generated from the blueprint `fintech/sanctions-name-screening-fuzzy-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sanctions Name Screening with Fuzzy Matching · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Sanctions Name Screening with Fuzzy Matching": Screen payments and customers against sanctions lists with high recall across transliterations while cutting false hits by 60%. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test set made of synthetic typos only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Phonetic-embedding similarity | cosine of character-aware name embeddings | Handles transliteration | Evaluate on held-out alias families |   |   |   |
| Secondary identifier agreement | DOB, nationality and ID overlap score | Disambiguates common names | Missing values must be neutral not negative |   |   |   |
| Alias-graph distance | shortest alias path between the query and list entity | Catches known aliases | Alias updates versioned by list date |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Recall | Cross-script, phonetic and token-order tolerant matching | Exact or edit-distance-only matching | Transliteration variants (Mohammed, Muhammad) defeat edit distance |
| Context | Secondary identifiers such as DOB, country and entity type | Name similarity alone | Common names generate floods of false hits |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Name length | length-biased distance artefacts |
| Payment amount | irrelevant for list membership |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Phonetic-embedding similarity inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: evaluate on held-out alias families. |
| Secondary identifier agreement inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: missing values must be neutral not negative. |
| Alias-graph distance inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: alias updates versioned by list date. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sanctions_name_screening_fuzzy_matching_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: phonetic_embedding_similarity, type: double, nullable: false }
    - { name: secondary_identifier_agreement, type: double, nullable: false }
    - { name: alias_graph_distance, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Phonetic-embedding similarity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Secondary identifier agreement against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Phonetic-embedding similarity, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE sanctions_name_screening_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  phonetic_embedding_similarity      DOUBLE PRECISION,
  secondary_identifier_agreement     DOUBLE PRECISION,
  alias_graph_distance               DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE sanctions_name_screening_decisions (
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
CREATE TABLE sanctions_name_screening_labels (
  decision_id    UUID        NOT NULL REFERENCES sanctions_name_screening_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Sanctions Name Screening with Fuzzy Matching": Screen payments and customers against sanctions lists with high recall across transliterations while cutting false hits by 60%. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Anti-money-laundering and know-your-customer | Banks must verify who customers are (KYC), monitor transactions for patterns such as structuring and layering, screen names against sanctions and politically exposed person lists, and file suspicious activity reports with regulators within deadlines. Monitoring generates alerts that investigators review; most are false. | The cost of an alert is analyst time and the cost of a miss is regulatory penalty, so evaluation uses alert-to-report ratios and investigator capacity, not accuracy. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Phonetic-embedding similarity | Cosine of character-aware name embeddings. Handles transliteration. | Leakage risk to design against: Evaluate on held-out alias families. |
| A signal-versus-noise trap in this use case: Recall | The true signal is cross-script, phonetic and token-order tolerant matching; the common noise is exact or edit-distance-only matching. | Transliteration variants (Mohammed, Muhammad) defeat edit distance. |

**Ask the experts**

- [ ] What exactly does "Recall must be near 100% on true listed names" mean in practice for sanctions name screening with fuzzy matching: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Phonetic-embedding similarity" and "Secondary identifier agreement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Analyst hours per 1000 screens" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test set made of synthetic typos only, and who can confirm the cut-off times and splits?
- [ ] How often does "List delta with 10k new entries" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Sanctions screening | Checking customers and payments against lists of sanctioned people, entities and countries. |
| PEP | Politically exposed person: someone with a prominent public role who needs extra scrutiny. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| BNPL | Buy now, pay later: short-term instalment credit offered at checkout, often with limited underwriting. |
| Layering | Moving money through many accounts and transactions to hide its origin. |
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Slippage | The difference between the price expected when an order is decided and the price actually obtained. |
| Market impact | The adverse price movement caused by one's own trading. |
| VWAP / TWAP | Volume-weighted and time-weighted average price: benchmarks and simple schedules for executing large orders. |
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
