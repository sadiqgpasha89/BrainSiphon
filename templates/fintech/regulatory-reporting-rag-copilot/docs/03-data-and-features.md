# Regulatory Reporting RAG Copilot: data and feature specification

> Generated from the blueprint `fintech/regulatory-reporting-rag-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Regulatory Reporting RAG Copilot · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Regulatory Reporting RAG Copilot": Answer compliance questions and pre-fill regulatory reports from rule books and internal data with exact citations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test questions copied from document headings.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Clause-level retrieval recall | share of ground-truth clauses retrieved in top 10 | Retrieval bounds answer quality | Evaluate with expert-labelled clauses |   |   |   |
| Effective-date match | rule version vs report period | Prevents wrong-law answers | Date from filing period not today |   |   |   |
| Definition linking | expanded defined terms inside the answer context | Correct interpretation | Link to the defining paragraph |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Versioning | Effective-date aware retrieval of rule versions | Latest-version only | Reports are filed under the rule version in force at period end |
| Structure | Hierarchical chunking by article, paragraph and definition | Fixed-size chunks | Definitions live far from the clauses that depend on them |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Generic web regulatory commentary | out-of-scope, unauthoritative |
| Model's parametric memory of regulations | stale and ungrounded |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Clause-level retrieval recall inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: evaluate with expert-labelled clauses. |
| Effective-date match inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: date from filing period not today. |
| Definition linking inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: link to the defining paragraph. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: regulatory_reporting_rag_copilot_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: clause_level_retrieval_recall, type: double, nullable: false }
    - { name: effective_date_match, type: double, nullable: false }
    - { name: definition_linking, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Clause-level retrieval recall and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Effective-date match against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Clause-level retrieval recall, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE regulatory_reporting_rag_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE regulatory_reporting_rag_steps (
  task_id TEXT NOT NULL REFERENCES regulatory_reporting_rag_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE regulatory_reporting_rag_approvals (
  task_id TEXT NOT NULL REFERENCES regulatory_reporting_rag_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Regulatory Reporting RAG Copilot": Answer compliance questions and pre-fill regulatory reports from rule books and internal data with exact citations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| Expected loss, provisioning and regulation | Lenders estimate probability of default (PD), loss given default (LGD) and exposure at default (EAD); expected loss is their product. Accounting rules such as IFRS 9 and CECL require provisions for expected losses over the life of a loan, and fair-lending laws restrict which features can drive decisions and require explanations for rejections. | Models are governed: they need monotonic, explainable behaviour, validation by an independent team and a documented reason for every adverse decision. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Clause-level retrieval recall | Share of ground-truth clauses retrieved in top 10. Retrieval bounds answer quality. | Leakage risk to design against: Evaluate with expert-labelled clauses. |
| A signal-versus-noise trap in this use case: Versioning | The true signal is effective-date aware retrieval of rule versions; the common noise is latest-version only. | Reports are filed under the rule version in force at period end. |

**Ask the experts**

- [ ] What exactly does "Every answer cites the rule paragraph" mean in practice for regulatory reporting rag copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Clause-level retrieval recall" and "Effective-date match", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to prepare report" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test questions copied from document headings, and who can confirm the cut-off times and splits?
- [ ] How often does "Amended regulation published today" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Adverse action notice | A required explanation to an applicant who was declined or offered worse terms, listing the main reasons. |
| Reason code | The network's code on a dispute that says why it was raised, for example fraud, goods not received or processing error. |
| KYC / CDD | Know your customer and customer due diligence: verifying identity and assessing risk when onboarding and during the relationship. |
| SAR / STR | Suspicious activity report or suspicious transaction report: the filing a bank makes to the regulator when it suspects money laundering. |
| Structuring | Splitting transactions into amounts just under reporting thresholds to avoid detection. |
| Layering | Moving money through many accounts and transactions to hide its origin. |
| Transaction monitoring | Rules and models that scan account activity for suspicious patterns and raise alerts. |
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| General ledger | The master accounting record of a company's financial transactions, built from debits and credits. |
| ISO 20022 | A global standard for financial messages with rich structured data used by modern payment systems. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Reranking | Reordering retrieved passages with a more precise model. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
