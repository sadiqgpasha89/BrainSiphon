# Healthcare Contract Compliance Monitoring: data and feature specification

> Generated from the blueprint `healthcare/healthcare-contract-compliance-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Compliance Monitoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Contract Compliance Monitoring": Monitor operational and commercial evidence against contractual obligations and service levels, so owners see breach risks and remediation tasks early and no formal breach notice is sent without their decision. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the model decide breach.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Service-level attainment | measured performance against SLA targets in the period | The primary compliance measure | Period closed |   |   |   |
| Obligation due-date proximity | days to due date for open obligations | Breach risk | Rule-computed |   |   |   |
| Invoice-to-term consistency | invoiced items and rates against terms | Commercial compliance | Contract version |   |   |   |
| Evidence freshness | age of the latest evidence for the obligation | Missing evidence is a risk | At scoring |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Status | Rule-based compliance against structured obligations | Model judgement of breach | Breach is a legal conclusion |
| Evidence | Linked transaction or service records | Narrative | Owners need the source to dispute |
| Timing | Breach risk before a deadline passes | Alert after the breach | Early notice allows remediation |
| Interpretation | LLM explains an ambiguous clause with citations as advice | LLM decides applicability | Interpretation belongs to the owner |
| Notices | Owner approves any formal notice | Agent sends notice | A notice has legal effect |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Supplier correspondence tone | opinion |
| Contract title | not compliance |
| Owner seniority | not a compliance factor |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Service-level attainment inputs | Contract management | Contract management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: period closed. |
| Obligation due-date proximity inputs | Operations owners | Obligation register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rule-computed. |
| Invoice-to-term consistency inputs | Procurement | Service and transaction systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract version. |
| Evidence freshness inputs | Legal | Invoice and payment system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: at scoring. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_contract_compliance_inputs.v1
owner: contract-management@example.com
system_of_record: Contract management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: service_level_attainment, type: double, nullable: false }
    - { name: obligation_due_date_proximity, type: double, nullable: false }
    - { name: invoice_to_term_consistency, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Service-level attainment and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Obligation due-date proximity against Contract management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Service-level attainment, traces back to Contract management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

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

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Contract Compliance Monitoring": Monitor operational and commercial evidence against contractual obligations and service levels, so owners see breach risks and remediation tasks early and no formal breach notice is sent without their decision. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Service-level attainment | Measured performance against SLA targets in the period. The primary compliance measure. | Leakage risk to design against: Period closed. |
| A signal-versus-noise trap in this use case: Status | The true signal is rule-based compliance against structured obligations; the common noise is model judgement of breach. | Breach is a legal conclusion. |

**Ask the experts**

- [ ] What exactly does "Rules and event processing determine compliance status and LLM interpretation is advisory and grounded" mean in practice for healthcare contract compliance monitoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Service-level attainment" and "Obligation due-date proximity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Breaches caught before notice deadlines" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting the model decide breach, and who can confirm the cut-off times and splits?
- [ ] How often does "Service data is delayed" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Wearable | A body-worn sensor, such as a watch, that records heart rate, movement or sleep. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Distribution shift | A change in the data a model sees compared with training. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Faithfulness | Whether an answer is supported by the cited sources. |
