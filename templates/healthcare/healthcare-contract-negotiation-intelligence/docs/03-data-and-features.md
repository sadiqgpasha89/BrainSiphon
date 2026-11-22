# Healthcare Contract Negotiation Intelligence: data and feature specification

> Generated from the blueprint `healthcare/healthcare-contract-negotiation-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Negotiation Intelligence · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Contract Negotiation Intelligence": Prepare negotiation briefs using historical terms, approved playbooks, performance, spend, risk and alternative suppliers, giving negotiators evidence-based priorities, fallback positions and draft talking points. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Accepting fluent benchmarks without a source.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Leverage indicators | spend share, alternatives and switching cost | Determines bargaining strength | Latest verified data |   |   |   |
| Performance record | service level misses and incidents | Supports claims | Verified records |   |   |   |
| Term deviation from portfolio norms | how far current terms differ from similar contracts | Shows where to push | Normalised terms |   |   |   |
| Benchmark comparability | match of benchmark scope to the contract | Prevents false comparisons | Source metadata |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Benchmarks | Approved benchmark with comparability notes | Invented market rate | A fabricated benchmark destroys credibility |
| Positions | Fallbacks from the approved playbook | Free-form positions | Negotiators need approved ground |
| Evidence | Performance and spend evidence per issue | General arguments | Leverage depends on facts |
| Scenarios | Trade-offs with assumptions stated | One recommendation | Negotiation has many acceptable endpoints |
| Authority | Approved strategy | Autonomous concessions | Concessions need approval |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Negotiator seniority | not leverage |
| Supplier public statements | not evidence |
| Brief length | not value |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Leverage indicators inputs | Procurement | Contract management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: latest verified data. |
| Performance record inputs | Legal | Clause library and playbook | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: verified records. |
| Term deviation from portfolio norms inputs | Contract management | Procurement and spend system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: normalised terms. |
| Benchmark comparability inputs | Finance | Supplier performance records | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: source metadata. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_contract_negotiation_inputs.v1
owner: procurement@example.com
system_of_record: Contract management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: leverage_indicators, type: double, nullable: false }
    - { name: performance_record, type: double, nullable: false }
    - { name: term_deviation_from_portfolio_norms, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Leverage indicators and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Performance record against Contract management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Leverage indicators, traces back to Contract management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE healthcare_contract_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE healthcare_contract_steps (
  task_id TEXT NOT NULL REFERENCES healthcare_contract_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE healthcare_contract_approvals (
  task_id TEXT NOT NULL REFERENCES healthcare_contract_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Contract Negotiation Intelligence": Prepare negotiation briefs using historical terms, approved playbooks, performance, spend, risk and alternative suppliers, giving negotiators evidence-based priorities, fallback positions and draft talking points. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Leverage indicators | Spend share, alternatives and switching cost. Determines bargaining strength. | Leakage risk to design against: Latest verified data. |
| A signal-versus-noise trap in this use case: Benchmarks | The true signal is approved benchmark with comparability notes; the common noise is invented market rate. | A fabricated benchmark destroys credibility. |

**Ask the experts**

- [ ] What exactly does "Negotiators and legal approve strategy" mean in practice for healthcare contract negotiation intelligence: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Leverage indicators" and "Performance record", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Negotiation preparation time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: accepting fluent benchmarks without a source, and who can confirm the cut-off times and splits?
- [ ] How often does "No approved benchmark exists" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
