# Public Safety Agent Action Guardrails: data and feature specification

> Generated from the blueprint `public-safety/public-safety-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Safety Agent Action Guardrails · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Public Safety Agent Action Guardrails": Bound what AI agents may do in dispatch, records and alerting systems for emergency services, keep a human decision on every consequential step and preserve a record that can stand up to review. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Direct dispatch rights.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Action tier of the proposal | whether it moves a unit or sends a public message | Approval routing | Dispatch system |   |   |   |
| Proposals per incident | suggestion volume against the incident norm | Runaway detection | Dispatch log |   |   |   |
| Dispatcher override rate | proposals changed or declined by dispatchers | Trust and drift signal | Decision records |   |   |   |
| Response time after proposal | clock time from proposal to unit en route | Outcome check | Dispatch timeline |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Enforcement | A dispatch gateway with action tiers | Instructions given to the agent | Lives may depend on a rule that cannot be talked around |
| Scope | Suggest-only access to dispatch and read access to records | Direct dispatch rights | A wrong dispatch costs response time elsewhere |
| Evidence | A time-stamped decision record with the human who approved | Call-taker notes | Oversight bodies ask who decided and why |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Unit callsign alone | an identifier |
| Call note length | not risk |
| Agent release number alone | needs outcome data |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Action tier of the proposal inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: dispatch system. |
| Proposals per incident inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: dispatch log. |
| Dispatcher override rate inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: decision records. |
| Response time after proposal inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: dispatch timeline. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: public_safety_agent_action_guardrails_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: action_tier_of_the_proposal, type: double, nullable: false }
    - { name: proposals_per_incident, type: double, nullable: false }
    - { name: dispatcher_override_rate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Action tier of the proposal and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Proposals per incident against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Action tier of the proposal, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE public_safety_agent_action_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE public_safety_agent_action_steps (
  task_id TEXT NOT NULL REFERENCES public_safety_agent_action_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE public_safety_agent_action_approvals (
  task_id TEXT NOT NULL REFERENCES public_safety_agent_action_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Public Safety Agent Action Guardrails": Bound what AI agents may do in dispatch, records and alerting systems for emergency services, keep a human decision on every consequential step and preserve a record that can stand up to review. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Dispatch is a resource allocation problem | Units differ in capability, position and availability, and demand is uneven across place and time. Good dispatch balances fast response with coverage for the next call. | Sending the nearest unit each time can leave an area uncovered, so coverage must be modelled. |
| Physical security uses sensors that create alerts | Cameras, access control and alarms generate many alerts, most of them benign. The task is to cut noise and surface events that need a human, such as an unattended item or a blocked exit. | Alert fatigue turns a good system into one that is switched off. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Action tier of the proposal | Whether it moves a unit or sends a public message. Approval routing. | Leakage risk to design against: Dispatch system. |
| A signal-versus-noise trap in this use case: Enforcement | The true signal is a dispatch gateway with action tiers; the common noise is instructions given to the agent. | Lives may depend on a rule that cannot be talked around. |

**Ask the experts**

- [ ] What exactly does "Dispatch and alerting rules enforced by a gateway the agent cannot change" mean in practice for public safety agent action guardrails: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Action tier of the proposal" and "Proposals per incident", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unsafe proposals blocked before dispatch" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: direct dispatch rights, and who can confirm the cut-off times and splits?
- [ ] How often does "Alert flood" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| Call-taker | The person who answers an emergency call. |
| Response time | The time from call to arrival of help. |
| Incident command | A system for managing response at the scene. |
| Human in the loop | A person reviews or approves the system's output. |
| Retention schedule | Rules for how long records are kept. |
| PSAP | Public safety answering point: the centre that answers emergency calls. |
| Dispatch protocol | A scripted set of questions that decides the response level. |
| NG911 | Next-generation emergency calling over IP networks. |
| Unit | A vehicle or team available for dispatch. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
