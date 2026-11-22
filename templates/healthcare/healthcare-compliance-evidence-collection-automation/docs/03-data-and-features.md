# Healthcare Compliance Evidence Collection Automation: data and feature specification

> Generated from the blueprint `healthcare/healthcare-compliance-evidence-collection-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Evidence Collection Automation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Compliance Evidence Collection Automation": Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the agent fill missing evidence.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Requirement match score | match between an artifact and the evidence requirement | Primary mapping signal | Reviewed mappings |   |   |   |
| Evidence age versus period | evidence date against the audit window | Freshness check | Document metadata |   |   |   |
| Completeness ratio | share of requirements with accepted evidence per control | Readiness view | Binder state |   |   |   |
| Source reliability | system-generated versus manually uploaded | Weights trust | Source register |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Provenance | Immutable reference with timestamp and source | Copied file | A copy cannot prove where it came from |
| Mapping | Evidence linked to a specific control requirement | Folder of documents | Auditors test one control at a time |
| Gaps | Missing evidence listed as an exception | Placeholder or inferred proof | Fabricated proof is a serious violation |
| Freshness | Evidence date compared to the audit period | Any document accepted | Out-of-period evidence fails an audit |
| Attestation | Owner confirms each item | Agent self-certifies | Accountability stays with owners |

## Features to drop

| Feature | Why it is noise |
|---|---|
| File name | unreliable label |
| Folder depth | storage artefact |
| Uploader seniority | not evidence quality |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Requirement match score inputs | Compliance | Control catalogue and evidence requirements | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: reviewed mappings. |
| Evidence age versus period inputs | Internal audit | Document repositories | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: document metadata. |
| Completeness ratio inputs | Control owners | System report generators | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: binder state. |
| Source reliability inputs | IT | Ownership directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: source register. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_compliance_evidence_inputs.v1
owner: compliance@example.com
system_of_record: Control catalogue and evidence requirements
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: requirement_match_score, type: double, nullable: false }
    - { name: evidence_age_versus_period, type: double, nullable: false }
    - { name: completeness_ratio, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Requirement match score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Evidence age versus period against Control catalogue and evidence requirements
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Requirement match score, traces back to Control catalogue and evidence requirements; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE healthcare_compliance_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE healthcare_compliance_steps (
  task_id TEXT NOT NULL REFERENCES healthcare_compliance_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE healthcare_compliance_approvals (
  task_id TEXT NOT NULL REFERENCES healthcare_compliance_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Compliance Evidence Collection Automation": Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Requirement match score | Match between an artifact and the evidence requirement. Primary mapping signal. | Leakage risk to design against: Reviewed mappings. |
| A signal-versus-noise trap in this use case: Provenance | The true signal is immutable reference with timestamp and source; the common noise is copied file. | A copy cannot prove where it came from. |

**Ask the experts**

- [ ] What exactly does "Control owners attest evidence and the agent never fabricates, edits or backfills missing proof" mean in practice for healthcare compliance evidence collection automation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Requirement match score" and "Evidence age versus period", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Audit preparation hours" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting the agent fill missing evidence, and who can confirm the cut-off times and splits?
- [ ] How often does "Evidence exists only in a person's mailbox" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Context window | The maximum amount of text a model can read at once. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
