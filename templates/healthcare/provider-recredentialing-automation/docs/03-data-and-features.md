# Provider Recredentialing Automation: data and feature specification

> Generated from the blueprint `healthcare/provider-recredentialing-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Recredentialing Automation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Provider Recredentialing Automation": Orchestrate periodic recredentialing cycles, evidence collection, verification, exception routing and committee packet preparation with a deterministic case state machine and human sign-off for every adverse finding. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the agent finalise a case.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Evidence completeness | required items received and verified by the checklist | Drives the next action | Checklist version as of the due date |   |   |   |
| Exception severity | rule-classified severity of each discrepancy | Prioritises human review | Rule output not the model's opinion |   |   |   |
| Citation coverage | share of summary statements with a source span | Measures faithfulness | Check against retrieved sources |   |   |   |
| Time to due date | days left against the average cycle | Schedules reminders | Calendar |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| State | Deterministic case state machine | A free-running agent | The case must be resumable and auditable |
| Authority | Draft and route only | Approve or deny | Adverse findings carry legal consequences |
| Grounding | Summary cites documents and rule version | Fluent summary from memory | A committee relies on the cited evidence |
| Tool use | Typed allow-listed tools with scopes | Free web or shell access | Least privilege limits damage from a bad input |
| Injection | Document text treated as data | Following instructions found in a CV | A malicious file could redirect the agent |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Provider reputation | irrelevant to evidence |
| Model confidence phrases | not a calibrated signal |
| Message tone | style not substance |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Evidence completeness inputs | Medical staff office | Credentialing and privileging system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: checklist version as of the due date. |
| Exception severity inputs | Credentialing operations | Provider master data | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: rule output not the model's opinion. |
| Citation coverage inputs | Compliance | Document repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: check against retrieved sources. |
| Time to due date inputs | Privileging committee | Committee and meeting management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calendar. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: provider_recredentialing_automation_inputs.v1
owner: medical-staff-office@example.com
system_of_record: Credentialing and privileging system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: evidence_completeness, type: double, nullable: false }
    - { name: exception_severity, type: double, nullable: false }
    - { name: citation_coverage, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Evidence completeness and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Exception severity against Credentialing and privileging system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Evidence completeness, traces back to Credentialing and privileging system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE provider_recredentialing_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE provider_recredentialing_steps (
  task_id TEXT NOT NULL REFERENCES provider_recredentialing_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE provider_recredentialing_approvals (
  task_id TEXT NOT NULL REFERENCES provider_recredentialing_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Provider Recredentialing Automation": Orchestrate periodic recredentialing cycles, evidence collection, verification, exception routing and committee packet preparation with a deterministic case state machine and human sign-off for every adverse finding. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Evidence completeness | Required items received and verified by the checklist. Drives the next action. | Leakage risk to design against: Checklist version as of the due date. |
| A signal-versus-noise trap in this use case: State | The true signal is deterministic case state machine; the common noise is a free-running agent. | The case must be resumable and auditable. |

**Ask the experts**

- [ ] What exactly does "An agent only drafts, retrieves and routes and every adverse finding, approval, denial or privilege change needs human sign-off" mean in practice for provider recredentialing automation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Evidence completeness" and "Exception severity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Recredentialing cycle time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting the agent finalise a case, and who can confirm the cut-off times and splits?
- [ ] How often does "Conflicting evidence" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
