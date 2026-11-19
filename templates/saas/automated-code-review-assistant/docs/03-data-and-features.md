# Automated Code Review Assistant: data and feature specification

> Generated from the blueprint `saas/automated-code-review-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Code Review Assistant · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Automated Code Review Assistant": Review pull requests for bugs, risks and style, posting high-signal comments that developers act on. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting all comments as value.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Comment acceptance rate | accepted or resolved comments | Quality | Logging |   |   |   |
| Static-analysis corroboration | linter or analyser agreement | Evidence | Tools |   |   |   |
| Test-failure linkage | comment correlates to failing tests | Signal | CI |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Precision | Filter comments by confidence and past acceptance | Comment on everything | Noisy bots get muted |
| Context | Cross-file context and tests | Diff-only analysis | Bugs depend on callers and invariants |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Style nitpicks | formatters handle them |
| Comment count | quantity |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Comment acceptance rate inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: logging. |
| Static-analysis corroboration inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: tools. |
| Test-failure linkage inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: CI. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: automated_code_review_assistant_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: comment_acceptance_rate, type: double, nullable: false }
    - { name: static_analysis_corroboration, type: double, nullable: false }
    - { name: test_failure_linkage, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Comment acceptance rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Static-analysis corroboration against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Comment acceptance rate, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE automated_code_review_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE automated_code_review_steps (
  task_id TEXT NOT NULL REFERENCES automated_code_review_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE automated_code_review_approvals (
  task_id TEXT NOT NULL REFERENCES automated_code_review_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Automated Code Review Assistant": Review pull requests for bugs, risks and style, posting high-signal comments that developers act on. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Engineering productivity and developer tools | Code completion, review, test selection, flaky test detection, deployment risk and pull-request summarisation reduce developer toil. Quality is measured by acceptance, correctness (do the tests pass) and trust; noisy tools get switched off. | Offline benchmarks like pass rates on toy problems do not predict real-world usefulness; measure acceptance and time saved in real repositories. |
| Evaluating a docs assistant | A golden set of real questions with known answers, including unanswerable and version-specific ones, is scored for correctness, faithfulness to the cited source, abstention when the docs are silent and, for code, whether the snippet compiles and runs. Questions written from page headings are too easy. | Abstaining is a feature. A refusal that is right is better than an answer that is plausible and wrong. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Comment acceptance rate | Accepted or resolved comments. Quality. | Leakage risk to design against: Logging. |
| A signal-versus-noise trap in this use case: Precision | The true signal is filter comments by confidence and past acceptance; the common noise is comment on everything. | Noisy bots get muted. |

**Ask the experts**

- [ ] What exactly does "Low noise (developers mute noisy bots)" mean in practice for automated code review assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Comment acceptance rate" and "Static-analysis corroboration", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Defects found pre-merge" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: counting all comments as value, and who can confirm the cut-off times and splits?
- [ ] How often does "Large PRs overflow context" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pull request (PR) | A proposed code change submitted for review before merging. |
| Fill-in-the-middle | A code-completion setup where the model fills a gap between the code before and after the cursor. |
| Email assistant | A tool that drafts replies in the user's style from the thread. |
| Chunk | A piece of a document, such as a section, that is indexed and retrieved as a unit. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| Meeting notes and action items | Summaries and tasks extracted from meetings, where attributing owners correctly is the main failure. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
