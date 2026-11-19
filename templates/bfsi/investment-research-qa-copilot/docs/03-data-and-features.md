# Investment Research Q&A Copilot: data and feature specification

> Generated from the blueprint `bfsi/investment-research-qa-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Investment Research Q&A Copilot · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Investment Research Q&A Copilot": Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on questions where the relevant notes are known flatters retrieval.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Citation validity | share of claims whose cited passage entails the claim | The core quality measure | A passage may exist and not support the claim, so test entailment |   |   |   |
| Retrieval recall | share of questions where the gold passage is in the top k | Everything depends on retrieval | Gold sets are costly to build, so sample across sectors |   |   |   |
| Abstention precision | share of refusals that were correct because the evidence was missing | Limits confident wrong answers | Over-refusal lowers usefulness, so track both |   |   |   |
| Freshness | age in days of each cited source against the latest available version | Prevents stale answers | Dating metadata are often missing or wrong |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Currency | The latest version of each note, estimate and filing | Any passage that matches the question | An old earnings estimate can be the closest text match and still be wrong |
| Entitlement | Access rights applied when documents are retrieved | A filter applied after the answer is written | A summary can leak restricted content even when the quoted text is removed |
| Numbers | Figures read from the firm's data service | Numbers copied from note text | Transcription errors and stale tables put a wrong figure into an answer that looks cited |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Note length | A style of the author and not a mark of relevance |
| Author | Weak signal once the content is matched, and it invites bias to star analysts |
| Rating word frequency | Counts of words like buy reflect the author's tone and not the facts |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Citation validity inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: A passage may exist and not support the claim, so test entailment. |
| Retrieval recall inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: gold sets are costly to build, so sample across sectors. |
| Abstention precision inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: over-refusal lowers usefulness, so track both. |
| Freshness inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: dating metadata are often missing or wrong. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: investment_research_qa_copilot_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: citation_validity, type: double, nullable: false }
    - { name: retrieval_recall, type: double, nullable: false }
    - { name: abstention_precision, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Citation validity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Retrieval recall against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Citation validity, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE investment_research_qa_copilot_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE investment_research_qa_copilot_steps (
  task_id TEXT NOT NULL REFERENCES investment_research_qa_copilot_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE investment_research_qa_copilot_approvals (
  task_id TEXT NOT NULL REFERENCES investment_research_qa_copilot_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Investment Research Q&A Copilot": Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Wealth management, advice and suitability | Advisers recommend products to clients under a duty to act in the client's interest. Suitability requires that a recommendation fits the client's objectives, risk tolerance, knowledge and circumstances, and firms must evidence this and detect mis-selling. | Anything that suggests a product must be filtered by suitability rules, and the adviser, not the model, remains accountable. |
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Citation validity | Share of claims whose cited passage entails the claim. The core quality measure. | Leakage risk to design against: A passage may exist and not support the claim, so test entailment. |
| A signal-versus-noise trap in this use case: Currency | The true signal is the latest version of each note, estimate and filing; the common noise is any passage that matches the question. | An old earnings estimate can be the closest text match and still be wrong. |

**Ask the experts**

- [ ] What exactly does "Every claim cites a document and its publication date" mean in practice for investment research q&a copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Citation validity" and "Retrieval recall", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Analyst time saved per question" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on questions where the relevant notes are known flatters retrieval, and who can confirm the cut-off times and splits?
- [ ] How often does "Restricted-list company" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| ASR | Automatic speech recognition: converting audio of calls into text. |
| Deposit beta | How much of a change in the policy rate the bank passes on to depositors. |
| Securities lending | Temporarily lending securities for a fee against collateral, often to short sellers. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Straight-through processing | Handling a transaction or claim end to end without manual touch. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Abstention | Declining to answer because the evidence is missing. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Context window | The maximum amount of text a model can read at once. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
