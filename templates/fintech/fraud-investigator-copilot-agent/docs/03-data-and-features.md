# Fraud Investigator Copilot Agent: data and feature specification

> Generated from the blueprint `fintech/fraud-investigator-copilot-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fraud Investigator Copilot Agent · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Fraud Investigator Copilot Agent": Give fraud analysts a copilot that assembles the case timeline, links entities and proposes dispositions, cutting investigation time by 50%. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replay set contains cases the model was tuned on.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Evidence link rate | share of claims with valid record IDs | Trust metric | Verify IDs against the source system |   |   |   |
| Tool-call success path | steps needed and failures per case type | Efficiency and reliability | Sample by case complexity |   |   |   |
| Disposition agreement | agreement between copilot suggestion and senior analyst | Quality signal | Blind comparison |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Tools | Typed read-only tools over case, graph and transaction stores | Giving the model raw database access | Raw access leaks data and enables injection-driven exfiltration |
| Evidence | Every claim linked to a record ID | Free-form narrative | Unsupported claims destroy analyst trust |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Narrative length | longer is not better |
| Confidence phrased in words | uncalibrated |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Evidence link rate inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: verify IDs against the source system. |
| Tool-call success path inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: sample by case complexity. |
| Disposition agreement inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: blind comparison. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: fraud_investigator_copilot_agent_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: evidence_link_rate, type: double, nullable: false }
    - { name: tool_call_success_path, type: double, nullable: false }
    - { name: disposition_agreement, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Evidence link rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Tool-call success path against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Evidence link rate, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BIRD text-to-SQL benchmark | https://bird-bench.github.io/ | CC BY-SA 4.0 (see the site) | A large benchmark of questions over big, messy databases with external knowledge | Execution cost is high. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE fraud_investigator_copilot_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE fraud_investigator_copilot_steps (
  task_id TEXT NOT NULL REFERENCES fraud_investigator_copilot_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE fraud_investigator_copilot_approvals (
  task_id TEXT NOT NULL REFERENCES fraud_investigator_copilot_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Fraud Investigator Copilot Agent": Give fraud analysts a copilot that assembles the case timeline, links entities and proposes dispositions, cutting investigation time by 50%. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Rules, models and step-up authentication | Production systems combine a rules engine, one or more models and a policy layer with three outcomes, not two: approve, decline or challenge. A challenge asks the customer to prove themselves, for example 3-D Secure or a one-time code, and a review queue gives human analysts the grey zone within their capacity. | Scores between the review and block thresholds should usually become a challenge, which cuts false declines without letting fraud through. |
| Anti-money-laundering and know-your-customer | Banks must verify who customers are (KYC), monitor transactions for patterns such as structuring and layering, screen names against sanctions and politically exposed person lists, and file suspicious activity reports with regulators within deadlines. Monitoring generates alerts that investigators review; most are false. | The cost of an alert is analyst time and the cost of a miss is regulatory penalty, so evaluation uses alert-to-report ratios and investigator capacity, not accuracy. |
| The authorisation flow and where the model sits | The cardholder pays a merchant, the merchant's acquirer or payment service provider sends an authorisation request through the card network to the issuer, and the issuer approves or declines. The fraud model typically runs at the issuer (which sees the card's whole history) or at the PSP and merchant (which see the basket, the device and the checkout session), and each sees different data. | Your feature list is limited to what your position in the chain can see, and the latency budget is a slice of the whole authorisation round trip. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Evidence link rate | Share of claims with valid record IDs. Trust metric. | Leakage risk to design against: Verify IDs against the source system. |
| A signal-versus-noise trap in this use case: Tools | The true signal is typed read-only tools over case, graph and transaction stores; the common noise is giving the model raw database access. | Raw access leaks data and enables injection-driven exfiltration. |

**Ask the experts**

- [ ] What exactly does "Read-only tools by default" mean in practice for fraud investigator copilot agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Evidence link rate" and "Tool-call success path", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Investigation time per case" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: replay set contains cases the model was tuned on, and who can confirm the cut-off times and splits?
- [ ] How often does "Injected instruction in a memo field" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| PAN | Primary account number, the 13-19 digit number on the card; storing it is tightly controlled, so systems use tokens instead. |
| BIN | Bank identification number, the first 6-8 digits of a PAN that identify the issuing bank and card product. |
| Issuer | The bank that issued the card to the cardholder and decides whether to approve each authorisation. |
| Acquirer | The bank or processor that handles card payments on behalf of the merchant and routes authorisations to the network. |
| PSP | Payment service provider, a company such as a payment gateway that gives merchants one integration for accepting payments. |
| Card network | The scheme such as Visa or Mastercard that carries authorisation messages between acquirer and issuer and sets dispute rules. |
| Authorisation | The real-time request in which the issuer approves or declines a payment; money moves later in clearing and settlement. |
| Clearing and settlement | The batch process after authorisation in which transaction details are exchanged and funds are actually transferred. |
| Chargeback | A reversal of a payment forced through the card network after the cardholder disputes it, usually weeks or months later. |
| Reason code | The network's code on a dispute that says why it was raised, for example fraud, goods not received or processing error. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| p99 latency | The time within which 99% of requests complete. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
