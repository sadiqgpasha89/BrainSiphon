# Loan Underwriting Copilot: data and feature specification

> Generated from the blueprint `fintech/loan-underwriting-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Loan Underwriting Copilot · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Loan Underwriting Copilot": Reduce commercial loan underwriting from days to hours by extracting financials, spreading statements and drafting credit memos with evidence links. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on clean PDFs only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Spread reconciliation delta | assets minus liabilities minus equity from extracted values | Catches extraction errors | Run after normalising units and currency |   |   |   |
| DSCR computation trace | formula plus cell references used | Auditable credit metric | Never let the LLM do arithmetic, use a calculator tool |   |   |   |
| Covenant clause retrieval | clause text matched to covenant taxonomy | Contract risk drivers | Pin to the executed version of the agreement |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Numbers | Extracted figures validated by accounting identities | Model-reported figures taken at face value | Balance sheets must balance; a failed identity exposes OCR errors |
| Retrieval | Section-aware chunking with table preservation | Fixed 512-token chunks | Fixed chunks split financial tables mid-row |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Narrative sentiment of the CEO letter | low predictive value and easy to game |
| Boilerplate risk factors | identical across filings, no discriminative content |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Spread reconciliation delta inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: run after normalising units and currency. |
| DSCR computation trace inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: never let the LLM do arithmetic, use a calculator tool. |
| Covenant clause retrieval inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: pin to the executed version of the agreement. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: loan_underwriting_copilot_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: spread_reconciliation_delta, type: double, nullable: false }
    - { name: dscr_computation_trace, type: double, nullable: false }
    - { name: covenant_clause_retrieval, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Spread reconciliation delta and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for DSCR computation trace against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Spread reconciliation delta, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BIRD text-to-SQL benchmark | https://bird-bench.github.io/ | CC BY-SA 4.0 (see the site) | A large benchmark of questions over big, messy databases with external knowledge | Execution cost is high. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE loan_underwriting_copilot_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE loan_underwriting_copilot_steps (
  task_id TEXT NOT NULL REFERENCES loan_underwriting_copilot_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE loan_underwriting_copilot_approvals (
  task_id TEXT NOT NULL REFERENCES loan_underwriting_copilot_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Loan Underwriting Copilot": Reduce commercial loan underwriting from days to hours by extracting financials, spreading statements and drafting credit memos with evidence links. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Spread reconciliation delta | Assets minus liabilities minus equity from extracted values. Catches extraction errors. | Leakage risk to design against: Run after normalising units and currency. |
| A signal-versus-noise trap in this use case: Numbers | The true signal is extracted figures validated by accounting identities; the common noise is model-reported figures taken at face value. | Balance sheets must balance; a failed identity exposes OCR errors. |

**Ask the experts**

- [ ] What exactly does "All numbers traceable to a source page" mean in practice for loan underwriting copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Spread reconciliation delta" and "DSCR computation trace", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to decision" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on clean PDFs only, and who can confirm the cut-off times and splits?
- [ ] How often does "Scanned statements with merged cells" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| Credit bureau | A company that collects borrowers' credit histories and sells reports and scores to lenders. |
| Vintage | A group of loans originated in the same period, tracked together over time to compare performance. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| Reject inference | Methods that estimate how declined applicants would have performed, to reduce selection bias in scorecards. |
| Scorecard | A points-based credit model, often built from binned features with monotonic weights, that regulators and underwriters can read. |
| ISO 20022 | A global standard for financial messages with rich structured data used by modern payment systems. |
| KYC / CDD | Know your customer and customer due diligence: verifying identity and assessing risk when onboarding and during the relationship. |
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| General ledger | The master accounting record of a company's financial transactions, built from debits and credits. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
