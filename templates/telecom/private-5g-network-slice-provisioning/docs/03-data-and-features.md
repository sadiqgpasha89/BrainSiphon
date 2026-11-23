# Private 5G Network & Slice Provisioning: data and feature specification

> Generated from the blueprint `telecom/private-5g-network-slice-provisioning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Private 5G Network & Slice Provisioning · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Private 5G Network & Slice Provisioning": Turn an enterprise request for a private 5G network or slice into a validated design, resource allocation and activation plan so business customers are live in days, not months. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the model quote without review.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Target service profile | required latency, throughput and reliability | Chooses the slice type | Must be machine-readable |   |   |   |
| Coverage and site fit | predicted indoor and outdoor coverage at the site | Feasibility | Needs a site survey input |   |   |   |
| Available capacity | free radio and core resources in the area | Limits the offer | Live not planned |   |   |   |
| Similar past deployments | outcome of deployments with the same profile | Risk and effort estimate | Only confirmed outcomes |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Requirements | Latency, coverage, device count and availability targets in numbers | A request such as fast and reliable | Vague needs produce designs that miss the SLA |
| Capacity | Live capacity and spectrum headroom | Static planning sheets | Old sheets over-promise |
| Sign-off | Engineer approval before any commitment | An auto-generated quote | A wrong commitment is a contractual liability |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer company size alone | not a technical need |
| Sales region | not a design driver |
| Quote length | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Target service profile inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: must be machine-readable. |
| Coverage and site fit inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs a site survey input. |
| Available capacity inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: live not planned. |
| Similar past deployments inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: only confirmed outcomes. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: private_5g_network_slice_provisioning_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: target_service_profile, type: double, nullable: false }
    - { name: coverage_and_site_fit, type: double, nullable: false }
    - { name: available_capacity, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Target service profile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Coverage and site fit against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Target service profile, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE private_5g_network_slice_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE private_5g_network_slice_steps (
  task_id TEXT NOT NULL REFERENCES private_5g_network_slice_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE private_5g_network_slice_approvals (
  task_id TEXT NOT NULL REFERENCES private_5g_network_slice_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Private 5G Network & Slice Provisioning": Turn an enterprise request for a private 5G network or slice into a validated design, resource allocation and activation plan so business customers are live in days, not months. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Provisioning turns an order into a working service | Activation spans order capture, inventory, number and SIM assignment, network configuration and billing set-up across OSS and BSS systems. Failures often come from data mismatches between those systems. | Fall-out in the middle of a multi-system flow leaves a paying customer without service, so orders need compensating steps and clear status. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Target service profile | Required latency, throughput and reliability. Chooses the slice type. | Leakage risk to design against: Must be machine-readable. |
| A signal-versus-noise trap in this use case: Requirements | The true signal is latency, coverage, device count and availability targets in numbers; the common noise is a request such as fast and reliable. | Vague needs produce designs that miss the SLA. |

**Ask the experts**

- [ ] What exactly does "Design output restricted to approved reference architectures" mean in practice for private 5g network & slice provisioning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Target service profile" and "Coverage and site fit", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Request to activation time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting the model quote without review, and who can confirm the cut-off times and splits?
- [ ] How often does "Unrealistic requirement" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Network slicing | Dividing a 5G network into virtual networks with different performance guarantees. |
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| SLA | Service level agreement: the availability or performance a provider commits to. |
| Spectrum | The radio frequencies licensed to an operator. |
| Provisioning | Configuring the network and systems so a purchased service works. |
| Core network | The central part of the network that handles authentication, session control and routing. |
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| PRB | Physical resource block: the unit of radio capacity allocated to users in a cell. |
| NFV | Network function virtualisation: running network functions as software on standard servers. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
