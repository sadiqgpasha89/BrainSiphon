# Healthcare Regulatory Change Impact Assessment: data and feature specification

> Generated from the blueprint `healthcare/healthcare-regulatory-change-impact-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Regulatory Change Impact Assessment · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Regulatory Change Impact Assessment": Translate a confirmed regulatory change into the policies, controls, facilities, workflows, systems, owners, evidence and deadlines it affects, and draft a task plan with dependencies for the compliance owner to approve. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Auto-creating tasks without approval.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Graph distance to the changed requirement | hops from the requirement to a policy, control or process | Ranks likely impact | Graph at assessment time |   |   |   |
| Owner and facility scope | facilities and owners connected to impacted nodes | Defines who acts | Directory as at assessment |   |   |   |
| Prior-change similarity | overlap with earlier changes and their actual impact | Calibrates the effort | Closed change projects |   |   |   |
| Dependency order | prerequisites between tasks | Sequencing | Plan rules |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Scope | Impacts traced through explicit relationships | Free-text guess of what is affected | A missed impact is a compliance gap |
| Plan | Draft tasks with dependencies and owners | Auto-created tasks | Owners must accept responsibility |
| Deadlines | Deterministic dates from the effective date | Model-estimated dates | Dates are facts of the change |
| Evidence | Completion checklist per impacted control | Closing on task completion | Proof of compliance is the goal |
| Effort | Range with assumptions | Point estimate | Planning needs uncertainty |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Change title wording | not impact |
| Owner seniority | not scope |
| Document formatting | layout |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Graph distance to the changed requirement inputs | Compliance | Compliance case system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: graph at assessment time. |
| Owner and facility scope inputs | Legal | Control and policy knowledge store | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: directory as at assessment. |
| Prior-change similarity inputs | Operations owners | Process inventory | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: closed change projects. |
| Dependency order inputs | Quality | Ownership directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: plan rules. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_regulatory_change_impact_inputs.v1
owner: compliance@example.com
system_of_record: Compliance case system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: graph_distance_to_the_changed, type: double, nullable: false }
    - { name: owner_and_facility_scope, type: double, nullable: false }
    - { name: prior_change_similarity, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Graph distance to the changed requirement and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Owner and facility scope against Compliance case system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Graph distance to the changed requirement, traces back to Compliance case system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
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
CREATE TABLE healthcare_regulatory_change_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE healthcare_regulatory_change_steps (
  task_id TEXT NOT NULL REFERENCES healthcare_regulatory_change_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE healthcare_regulatory_change_approvals (
  task_id TEXT NOT NULL REFERENCES healthcare_regulatory_change_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Regulatory Change Impact Assessment": Translate a confirmed regulatory change into the policies, controls, facilities, workflows, systems, owners, evidence and deadlines it affects, and draft a task plan with dependencies for the compliance owner to approve. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Graph distance to the changed requirement | Hops from the requirement to a policy, control or process. Ranks likely impact. | Leakage risk to design against: Graph at assessment time. |
| A signal-versus-noise trap in this use case: Scope | The true signal is impacts traced through explicit relationships; the common noise is free-text guess of what is affected. | A missed impact is a compliance gap. |

**Ask the experts**

- [ ] What exactly does "The compliance owner approves scope, tasks and deadlines before any task is created" mean in practice for healthcare regulatory change impact assessment: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Graph distance to the changed requirement" and "Owner and facility scope", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to approved implementation plan" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: auto-creating tasks without approval, and who can confirm the cut-off times and splits?
- [ ] How often does "Stale knowledge graph" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Node / edge | The entities in a graph and the relationships between them. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
