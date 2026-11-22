# Healthcare Contract Redlining Copilot: data and feature specification

> Generated from the blueprint `healthcare/healthcare-contract-redlining-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Redlining Copilot · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Contract Redlining Copilot": Suggest changes to contract clauses against approved legal playbooks and explain the rationale, the negotiation trade-offs and the unresolved legal questions, so counsel can review proposed redlines faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Measuring fluency not approval.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Playbook match | retrieved playbook clause and fallback levels for the issue | Grounds the redline | Playbook version |   |   |   |
| Deviation severity | classified severity of the clause deviation | Prioritises the work | Classifier calibration |   |   |   |
| Acceptance history | rate at which similar redlines were approved | Helps ranking | Past approved redlines |   |   |   |
| Diff size | length of the proposed change | Reviewers prefer minimal edits | Computed from the diff |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Replacement language drawn from approved playbook | Freshly invented clause text | Invented text has no legal approval |
| Rationale | Cites the playbook rule and the deviation | Confident explanation | Counsel needs to verify the reason |
| Authority | Proposal for counsel | Auto-accepted change | Each change needs approval |
| Scope | Clause-level change with structured diff | Whole-document rewrite | Reviewers cannot audit a rewrite |
| Limits | Unresolved questions listed | Pretended certainty | A hidden gap becomes a missed risk |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Writing fluency | style |
| Model confidence phrases | not calibrated |
| Counterparty identity | not legal merit |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Playbook match inputs | Legal | Contract management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: playbook version. |
| Deviation severity inputs | Procurement | Clause playbook and fallback library | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: classifier calibration. |
| Acceptance history inputs | Compliance | Document editing system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: past approved redlines. |
| Diff size inputs | Legal | Approved redline history | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: computed from the diff. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_contract_redlining_copilot_inputs.v1
owner: legal@example.com
system_of_record: Contract management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: playbook_match, type: double, nullable: false }
    - { name: deviation_severity, type: double, nullable: false }
    - { name: acceptance_history, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Playbook match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Deviation severity against Contract management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Playbook match, traces back to Contract management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE healthcare_contract_redlining_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE healthcare_contract_redlining_steps (
  task_id TEXT NOT NULL REFERENCES healthcare_contract_redlining_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE healthcare_contract_redlining_approvals (
  task_id TEXT NOT NULL REFERENCES healthcare_contract_redlining_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Contract Redlining Copilot": Suggest changes to contract clauses against approved legal playbooks and explain the rationale, the negotiation trade-offs and the unresolved legal questions, so counsel can review proposed redlines faster. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Playbook match | Retrieved playbook clause and fallback levels for the issue. Grounds the redline. | Leakage risk to design against: Playbook version. |
| A signal-versus-noise trap in this use case: Source | The true signal is replacement language drawn from approved playbook; the common noise is freshly invented clause text. | Invented text has no legal approval. |

**Ask the experts**

- [ ] What exactly does "Legal review and explicit approval are required for every proposed change" mean in practice for healthcare contract redlining copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Playbook match" and "Deviation severity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Counsel review time per contract" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: measuring fluency not approval, and who can confirm the cut-off times and splits?
- [ ] How often does "No playbook clause exists" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Medication adherence | Whether patients take medicines as prescribed. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
