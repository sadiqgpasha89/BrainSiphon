# Network Data Privacy & Retention Compliance Copilot: data and feature specification

> Generated from the blueprint `telecom/network-data-privacy-retention-compliance-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Network Data Privacy & Retention Compliance Copilot · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Network Data Privacy & Retention Compliance Copilot": Answer privacy and retention questions about network and subscriber data, map datasets to rules and flag gaps, so engineers and legal teams make consistent decisions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating the answer as legal advice.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Dataset classification | sensitivity and retention class from the catalogue | Maps rules | Needs catalogue coverage |   |   |   |
| Purpose match | whether a use case matches an approved purpose | Basis for allowing a use | Purpose register |   |   |   |
| Retention timer status | age of data against the retention class | Finds overdue data | From storage metadata |   |   |   |
| Cross-border flow | whether data leaves its jurisdiction | Transfer rules | From data lineage |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | The current policy and the data catalogue with owners | Model memory of privacy law | Rules differ by country and change |
| Scope | Datasets mapped to purposes and retention classes | General privacy advice | Teams need decisions about their data |
| Authority | A named legal owner signs off interpretation | The copilot's answer | An answer is not a legal opinion |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Question phrasing | not substance |
| Requester seniority | not relevant to rules |
| Document formatting | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Dataset classification inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: needs catalogue coverage. |
| Purpose match inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: purpose register. |
| Retention timer status inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from storage metadata. |
| Cross-border flow inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from data lineage. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: network_data_privacy_retention_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: dataset_classification, type: double, nullable: false }
    - { name: purpose_match, type: double, nullable: false }
    - { name: retention_timer_status, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Dataset classification and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Purpose match against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Dataset classification, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE network_data_privacy_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE network_data_privacy_steps (
  task_id TEXT NOT NULL REFERENCES network_data_privacy_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE network_data_privacy_approvals (
  task_id TEXT NOT NULL REFERENCES network_data_privacy_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Network Data Privacy & Retention Compliance Copilot": Answer privacy and retention questions about network and subscriber data, map datasets to rules and flag gaps, so engineers and legal teams make consistent decisions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Subscriber data is regulated | Location, call and browsing records are personal data with retention limits, consent requirements and lawful-access rules. Analytics normally run on pseudonymised, aggregated data with strict access controls. | A use case that needs identified location data needs a legal basis and tight controls before any model is built. |
| Churn has drivers and a cost to prevent | Subscribers leave because of price, network quality, service failures, competitor offers and contract end dates. Retention offers cost margin, so they should go to customers who are both at risk and persuadable. | Predicting only who will leave wastes offers on customers who would have stayed or who cannot be saved. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Dataset classification | Sensitivity and retention class from the catalogue. Maps rules. | Leakage risk to design against: Needs catalogue coverage. |
| A signal-versus-noise trap in this use case: Source | The true signal is the current policy and the data catalogue with owners; the common noise is model memory of privacy law. | Rules differ by country and change. |

**Ask the experts**

- [ ] What exactly does "Answers cite the policy clause and the data catalogue entry" mean in practice for network data privacy & retention compliance copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Dataset classification" and "Purpose match", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to answer privacy questions" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating the answer as legal advice, and who can confirm the cut-off times and splits?
- [ ] How often does "Conflicting rules" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Churn | The share of subscribers who leave in a period. |
| Core network | The central part of the network that handles authentication, session control and routing. |
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| NFV | Network function virtualisation: running network functions as software on standard servers. |
| SDN | Software-defined networking: separating control from forwarding so the network is programmable. |
| Network slicing | Dividing a 5G network into virtual networks with different performance guarantees. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Token cost | The price of a model call, proportional to input and output tokens. |
