# Symptom Checker & Care Navigation: data and feature specification

> Generated from the blueprint `healthcare/symptom-checker-and-care-navigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Symptom Checker & Care Navigation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Symptom Checker & Care Navigation": Guide users from symptoms to the right level of care (self-care, GP, urgent, emergency) safely and consistently. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Vignettes simpler than real patients.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Red-flag symptom detection | rule-based emergency symptom match | Hard escalation | Clinician-curated list |   |   |   |
| Symptom-slot completeness | required questions answered | Reliability | Dialogue state |   |   |   |
| Demographic and history risk | age, pregnancy, chronic disease | Modifies urgency | Self-reported |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Safety | Conservative disposition with red-flag rules | Maximum-likelihood diagnosis | The goal is correct urgency not a diagnosis |
| Protocol | Clinically authored decision logic with ML assisting | Pure LLM reasoning | Protocols must be auditable and consistent |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Chat length | none |
| Device | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Red-flag symptom detection inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: clinician-curated list. |
| Symptom-slot completeness inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: dialogue state. |
| Demographic and history risk inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: self-reported. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: symptom_checker_and_care_navigation_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: red_flag_symptom_detection, type: double, nullable: false }
    - { name: symptom_slot_completeness, type: double, nullable: false }
    - { name: demographic_and_history_risk, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Red-flag symptom detection and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Symptom-slot completeness against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Red-flag symptom detection, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
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
CREATE TABLE symptom_checker_and_care_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE symptom_checker_and_care_steps (
  task_id TEXT NOT NULL REFERENCES symptom_checker_and_care_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE symptom_checker_and_care_approvals (
  task_id TEXT NOT NULL REFERENCES symptom_checker_and_care_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Symptom Checker & Care Navigation": Guide users from symptoms to the right level of care (self-care, GP, urgent, emergency) safely and consistently. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Red-flag symptom detection | Rule-based emergency symptom match. Hard escalation. | Leakage risk to design against: Clinician-curated list. |
| A signal-versus-noise trap in this use case: Safety | The true signal is conservative disposition with red-flag rules; the common noise is maximum-likelihood diagnosis. | The goal is correct urgency not a diagnosis. |

**Ask the experts**

- [ ] What exactly does "Under-triage minimised" mean in practice for symptom checker & care navigation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Red-flag symptom detection" and "Symptom-slot completeness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Appropriate care-level match" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: vignettes simpler than real patients, and who can confirm the cut-off times and splits?
- [ ] How often does "User downplays symptoms" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Care management | Programmes that give extra support to high-risk patients, which risk models are used to target. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Abstention | Declining to answer because the evidence is missing. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
