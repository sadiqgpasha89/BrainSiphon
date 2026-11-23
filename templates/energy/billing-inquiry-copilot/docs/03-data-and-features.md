# Billing Inquiry Copilot: data and feature specification

> Generated from the blueprint `energy/billing-inquiry-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Billing Inquiry Copilot · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Billing Inquiry Copilot": Help contact centre agents explain bills, tariffs and adjustments by retrieving the customer's own billing facts and the controlled policy, with every figure computed by tools. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model-computed amounts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Identity verification state | whether the customer is verified | Access gate | From the contact system |   |   |   |
| Bill line items | charges, credits and estimates | Evidence | From billing |   |   |   |
| Tariff and policy version | the rule version that applies | Correct answer | From the policy store |   |   |   |
| Inquiry type | high bill, estimate, payment or move | Routing | Classified |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Facts | Billing data retrieved by tools after identity verification | Model memory | Wrong amounts cause complaints and compensation |
| Policy | Controlled policy and regulator rules | General knowledge | Rules differ by region and change |
| Authority | Agents decide and act | The copilot acting alone | Credits and plans need accountable people |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Agent name | irrelevant |
| Call length | not correctness |
| Chat tone | not facts |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Identity verification state inputs | Network operations | SCADA and ADMS (advanced distribution management) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the contact system. |
| Bill line items inputs | Asset management | Meter data management and billing (CIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from billing. |
| Tariff and policy version inputs | Retail and customer operations | Asset management and GIS | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the policy store. |
| Inquiry type inputs | Network operations | SCADA and ADMS (advanced distribution management) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: classified. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: billing_inquiry_copilot_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: identity_verification_state, type: double, nullable: false }
    - { name: bill_line_items, type: double, nullable: false }
    - { name: tariff_and_policy_version, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Identity verification state and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Bill line items against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Identity verification state, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE billing_inquiry_copilot_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE billing_inquiry_copilot_steps (
  task_id TEXT NOT NULL REFERENCES billing_inquiry_copilot_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE billing_inquiry_copilot_approvals (
  task_id TEXT NOT NULL REFERENCES billing_inquiry_copilot_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Billing Inquiry Copilot": Help contact centre agents explain bills, tariffs and adjustments by retrieving the customer's own billing facts and the controlled policy, with every figure computed by tools. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Smart meters produce large volumes of interval data | Meters report consumption at short intervals, which supports billing, loss detection and demand analytics but raises privacy concerns because the pattern reveals household behaviour. | Analytics should use aggregation and access controls and avoid inferring sensitive household behaviour. |
| Operators and protection systems hold control | Grid, gas and water operations are safety-critical and regulated. AI recommends and forecasts, while switching, dispatch and protection stay with licensed operators and certified systems. | A recommendation that cannot be explained or overridden will not be used in a control room. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Identity verification state | Whether the customer is verified. Access gate. | Leakage risk to design against: From the contact system. |
| A signal-versus-noise trap in this use case: Facts | The true signal is billing data retrieved by tools after identity verification; the common noise is model memory. | Wrong amounts cause complaints and compensation. |

**Ask the experts**

- [ ] What exactly does "Answers use the customer's verified account and controlled policy text" mean in practice for billing inquiry copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Identity verification state" and "Bill line items", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Handle time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: model-computed amounts, and who can confirm the cut-off times and splits?
- [ ] How often does "Unverified caller" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Demand response | Paying or asking customers to shift or cut use at peak times. |
| State of charge | How full a battery is. |
| Non-technical loss | Energy lost to theft, metering errors or billing faults. |
| Time-of-use tariff | A price that depends on the time of day. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control the network. |
| SAIDI | System average interruption duration index: average outage minutes per customer. |
| SAIFI | System average interruption frequency index: average number of outages per customer. |
| Feeder | A distribution line that carries power from a substation to customers. |
| Spinning reserve | Generation capacity ready to respond quickly. |
| Battery storage | Batteries that store energy for later use. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
