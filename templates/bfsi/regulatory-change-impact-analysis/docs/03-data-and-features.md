# Regulatory Change Impact Analysis: data and feature specification

> Generated from the blueprint `bfsi/regulatory-change-impact-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Regulatory Change Impact Analysis · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Regulatory Change Impact Analysis": Read new regulations and consultations, map them to the bank's policies, processes and systems, and draft an impact assessment for compliance owners. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation on documents seen in prompts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Obligation extraction precision | share of extracted obligations accepted by the owner | Core quality | Needs a labelled test set |   |   |   |
| Policy mapping recall | share of true links found | Missed links are risks | Gold links are costly to build |   |   |   |
| Effective date correctness | extracted date versus the official date | Drives plans | Phased dates are common |   |   |   |
| Gap flag | obligation without a mapped control | Prioritises work | False gaps waste time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Obligation | Individual obligations extracted with scope, deadline and role | Summaries of the whole document | Summaries lose the 'must by date' that drives work |
| Mapping | Obligations linked to existing controls and policies | Keyword overlap | The same word means different things in different regimes |
| Currency | The current in-force version and effective dates | Any version found in search | Superseded text is a common source of wrong advice |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Document length | style |
| Law firm commentary | useful but not authoritative |
| Headline tone | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Obligation extraction precision inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: needs a labelled test set. |
| Policy mapping recall inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: gold links are costly to build. |
| Effective date correctness inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: phased dates are common. |
| Gap flag inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: false gaps waste time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: regulatory_change_impact_analysis_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: obligation_extraction_precision, type: double, nullable: false }
    - { name: policy_mapping_recall, type: double, nullable: false }
    - { name: effective_date_correctness, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Obligation extraction precision and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Policy mapping recall against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Obligation extraction precision, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE regulatory_change_impact_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE regulatory_change_impact_steps (
  task_id TEXT NOT NULL REFERENCES regulatory_change_impact_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE regulatory_change_impact_approvals (
  task_id TEXT NOT NULL REFERENCES regulatory_change_impact_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Regulatory Change Impact Analysis": Read new regulations and consultations, map them to the bank's policies, processes and systems, and draft an impact assessment for compliance owners. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Regulatory change and reporting | Rules change constantly across prudential, conduct and financial crime regimes. Firms track consultations, map obligations to policies and controls, report to supervisors on fixed schedules and keep evidence of compliance. | Language-model tools that summarise regulation must cite the paragraph and the version in force, because a confident summary of superseded text is worse than none. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Obligation extraction precision | Share of extracted obligations accepted by the owner. Core quality. | Leakage risk to design against: Needs a labelled test set. |
| A signal-versus-noise trap in this use case: Obligation | The true signal is individual obligations extracted with scope, deadline and role; the common noise is summaries of the whole document. | Summaries lose the 'must by date' that drives work. |

**Ask the experts**

- [ ] What exactly does "Every mapped obligation cites the regulatory paragraph" mean in practice for regulatory change impact analysis: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Obligation extraction precision" and "Policy mapping recall", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time from publication to impact assessment" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluation on documents seen in prompts, and who can confirm the cut-off times and splits?
- [ ] How often does "Ambiguous drafting" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Obligation register | A list of regulatory requirements mapped to the policies and controls that satisfy them. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| Securities lending | Temporarily lending securities for a fee against collateral, often to short sellers. |
| Suitability | The requirement that a recommended product fits the client's objectives, risk tolerance and circumstances. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Persistency | The share of policies that stay in force over time; lapse is its opposite. |
| Straight-through processing | Handling a transaction or claim end to end without manual touch. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
