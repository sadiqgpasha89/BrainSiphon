# Transaction Monitoring Alert Triage with LLM Agents: data and feature specification

> Generated from the blueprint `fintech/transaction-monitoring-alert-triage-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Transaction Monitoring Alert Triage with LLM Agents · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Transaction Monitoring Alert Triage with LLM Agents": Auto-summarise and pre-dispose low-risk AML alerts with cited evidence so analysts spend time only on genuinely suspicious cases. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Golden set written by the same team that prompts the model.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Evidence coverage | fraction of narrative sentences linked to a source record | Detects hallucination directly | Coverage must be computed on the final text not the draft |   |   |   |
| Rule-hit context | which scenario fired and its threshold distance | Anchors the investigation | Include scenario version to stay point-in-time |   |   |   |
| Customer behaviour baseline | 12-month median and MAD of monthly flows | Defines what is unusual for this person | Baseline excludes the alert month |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Grounding | Answers constructed only from retrieved transaction and KYC facts | Fluent narratives that sound right | An unsupported sentence in a SAR narrative is a regulatory finding |
| Autonomy | Agent drafts and recommends, human disposes | Fully autonomous closure of alerts | Regulators require accountable human decisions |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Long free-text KYC notes | stale and contradictory, retrieve structured fields first |
| Full transaction dump in prompt | blows context and dilutes attention, summarise windows instead |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Evidence coverage inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: coverage must be computed on the final text not the draft. |
| Rule-hit context inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: include scenario version to stay point-in-time. |
| Customer behaviour baseline inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: baseline excludes the alert month. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: transaction_monitoring_alert_triage_llm_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: evidence_coverage, type: double, nullable: false }
    - { name: rule_hit_context, type: double, nullable: false }
    - { name: customer_behaviour_baseline, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Evidence coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Rule-hit context against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Evidence coverage, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BIRD text-to-SQL benchmark | https://bird-bench.github.io/ | CC BY-SA 4.0 (see the site) | A large benchmark of questions over big, messy databases with external knowledge | Execution cost is high. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE transaction_monitoring_alert_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE transaction_monitoring_alert_steps (
  task_id TEXT NOT NULL REFERENCES transaction_monitoring_alert_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE transaction_monitoring_alert_approvals (
  task_id TEXT NOT NULL REFERENCES transaction_monitoring_alert_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Transaction Monitoring Alert Triage with LLM Agents": Auto-summarise and pre-dispose low-risk AML alerts with cited evidence so analysts spend time only on genuinely suspicious cases. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Anti-money-laundering and know-your-customer | Banks must verify who customers are (KYC), monitor transactions for patterns such as structuring and layering, screen names against sanctions and politically exposed person lists, and file suspicious activity reports with regulators within deadlines. Monitoring generates alerts that investigators review; most are false. | The cost of an alert is analyst time and the cost of a miss is regulatory penalty, so evaluation uses alert-to-report ratios and investigator capacity, not accuracy. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Evidence coverage | Fraction of narrative sentences linked to a source record. Detects hallucination directly. | Leakage risk to design against: Coverage must be computed on the final text not the draft. |
| A signal-versus-noise trap in this use case: Grounding | The true signal is answers constructed only from retrieved transaction and KYC facts; the common noise is fluent narratives that sound right. | An unsupported sentence in a SAR narrative is a regulatory finding. |

**Ask the experts**

- [ ] What exactly does "Every claim must cite a transaction or KYC record" mean in practice for transaction monitoring alert triage with llm agents: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Evidence coverage" and "Rule-hit context", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Analyst minutes per alert" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: golden set written by the same team that prompts the model, and who can confirm the cut-off times and splits?
- [ ] How often does "Prompt injection inside a payment reference field" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Structuring | Splitting transactions into amounts just under reporting thresholds to avoid detection. |
| Transaction monitoring | Rules and models that scan account activity for suspicious patterns and raise alerts. |
| SAR / STR | Suspicious activity report or suspicious transaction report: the filing a bank makes to the regulator when it suspects money laundering. |
| Layering | Moving money through many accounts and transactions to hide its origin. |
| KYC / CDD | Know your customer and customer due diligence: verifying identity and assessing risk when onboarding and during the relationship. |
| PEP | Politically exposed person: someone with a prominent public role who needs extra scrutiny. |
| Typology | A documented pattern of how a crime is carried out, used to design detection scenarios. |
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
