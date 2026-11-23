# Repository-Aware Code Completion: data and feature specification

> Generated from the blueprint `devtools/repo-aware-code-completion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Repository-Aware Code Completion · **Domain:** devtools · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Repository-Aware Code Completion": Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Shown-suggestion metrics.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Cursor and file context | code around the cursor | Prompt basis | From the editor |   |   |   |
| Related file retrieval | similar or imported files | Local conventions | From the code index |   |   |   |
| Language and framework | detected language and libraries | Style | From the project |   |   |   |
| Acceptance history aggregate | aggregate acceptance by language and kind | Tuning | Team-level |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Retrieved snippets from the same repository | Generic public code only | Local APIs and styles matter |
| Metric | Accepted and retained suggestions | Suggestions shown | Shown suggestions can be ignored |
| Safety | Filters for secrets and restricted licences | Unfiltered output | Output can leak or infringe |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Developer name | personal data |
| Editor theme | irrelevant |
| Keystroke timing | a monitoring artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Cursor and file context inputs | Developer experience | Source control and code review platform | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from the editor. |
| Related file retrieval inputs | Platform engineering | CI/CD and artifact registry | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the code index. |
| Language and framework inputs | Application security | Issue tracker and developer portal | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from the project. |
| Acceptance history aggregate inputs | Developer experience | Source control and code review platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: team-level. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: repo_aware_code_completion_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: cursor_and_file_context, type: double, nullable: false }
    - { name: related_file_retrieval, type: double, nullable: false }
    - { name: language_and_framework, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Cursor and file context and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Related file retrieval against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Cursor and file context, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE repo_aware_code_completion_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE repo_aware_code_completion_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES repo_aware_code_completion_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON repo_aware_code_completion_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE repo_aware_code_completion_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Repository-Aware Code Completion": Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Developer productivity is a team-level concept | Flow metrics such as lead time and deployment frequency describe a system. Used on individuals, they are gamed and harm trust. | Any measurement should be aggregated to teams and agreed with employee representatives where required. |
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Application security depends on reachability | Scanners report many findings, but only some are reachable and exploitable in a given application. Prioritising by reachability, exposure and data sensitivity focuses scarce fixing time. | A raw severity score floods teams with findings that cannot be exploited. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Cursor and file context | Code around the cursor. Prompt basis. | Leakage risk to design against: From the editor. |
| A signal-versus-noise trap in this use case: Context | The true signal is retrieved snippets from the same repository; the common noise is generic public code only. | Local APIs and styles matter. |

**Ask the experts**

- [ ] What exactly does "Suggestion latency under 200 ms" mean in practice for repository-aware code completion: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Cursor and file context" and "Related file retrieval", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Retained accepted code" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: shown-suggestion metrics, and who can confirm the cut-off times and splits?
- [ ] How often does "Private repository access" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Monorepo | One repository holding many projects. |
| Test coverage | The share of code run by tests. |
| Static analysis | Checking code for problems without running it. |
| Code owner | The team responsible for part of the code. |
| Code generation | Producing code with an AI model. |
| Code review | Examination of a change by another engineer. |
| Commit | A saved change to the code base. |
| Regression | A defect introduced by a change to previously working behaviour. |
| Technical debt | The cost of shortcuts that make later changes harder. |
| Reachability | Whether vulnerable code can actually be called. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Context window | The maximum amount of text a model can read at once. |
| Latency budget | The time allowed for a response, split across retrieval, generation and checks. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Near-duplicate | A text that is almost identical to another, such as a forwarded email, which leaks across random splits. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
