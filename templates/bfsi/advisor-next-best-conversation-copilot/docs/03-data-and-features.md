# Wealth Advisor Next-Best-Conversation Copilot: data and feature specification

> Generated from the blueprint `bfsi/advisor-next-best-conversation-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wealth Advisor Next-Best-Conversation Copilot · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Wealth Advisor Next-Best-Conversation Copilot": Suggest which clients an advisor should contact and why, with a drafted talking-points note built from the client's own records. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past actions reflect advisor taste.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Cash drift | idle cash above the target for 30 days | Clear reason to call | Account balances must be fresh |   |   |   |
| Portfolio drift | deviation from the agreed allocation | Triggers a rebalancing talk | Mandate definitions differ |   |   |   |
| Maturity ladder | products maturing in the next 60 days | Time-bound reason | Missing for some accounts |   |   |   |
| Advisor action rate | share of past suggestions acted on | Learns usefulness | Reflects advisor habits |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Trigger | Concrete events: maturity, cash drift, life event, market move | Generic contact schedules | Calls without a reason are ignored |
| Suitability | Product ideas filtered by client profile and rules | Highest-margin product | Mis-selling risk is a regulatory issue |
| Evidence | Notes drafted from records with citations | Free-form generated advice | Unsupported statements create liability |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Client last name | irrelevant |
| Advisor tenure | weak |
| Email open rate | weak link to need |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Cash drift inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: account balances must be fresh. |
| Portfolio drift inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: mandate definitions differ. |
| Maturity ladder inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: missing for some accounts. |
| Advisor action rate inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: reflects advisor habits. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: advisor_next_best_conversation_copilot_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: cash_drift, type: double, nullable: false }
    - { name: portfolio_drift, type: double, nullable: false }
    - { name: maturity_ladder, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Cash drift and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Portfolio drift against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Cash drift, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE advisor_next_best_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE advisor_next_best_steps (
  task_id TEXT NOT NULL REFERENCES advisor_next_best_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE advisor_next_best_approvals (
  task_id TEXT NOT NULL REFERENCES advisor_next_best_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Wealth Advisor Next-Best-Conversation Copilot": Suggest which clients an advisor should contact and why, with a drafted talking-points note built from the client's own records. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Wealth management, advice and suitability | Advisers recommend products to clients under a duty to act in the client's interest. Suitability requires that a recommendation fits the client's objectives, risk tolerance, knowledge and circumstances, and firms must evidence this and detect mis-selling. | Anything that suggests a product must be filtered by suitability rules, and the adviser, not the model, remains accountable. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Cash drift | Idle cash above the target for 30 days. Clear reason to call. | Leakage risk to design against: Account balances must be fresh. |
| A signal-versus-noise trap in this use case: Trigger | The true signal is concrete events: maturity, cash drift, life event, market move; the common noise is generic contact schedules. | Calls without a reason are ignored. |

**Ask the experts**

- [ ] What exactly does "Every suggestion cites client data" mean in practice for wealth advisor next-best-conversation copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Cash drift" and "Portfolio drift", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Meaningful conversations per advisor-week" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: past actions reflect advisor taste, and who can confirm the cut-off times and splits?
- [ ] How often does "Vulnerable client" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Suitability | The requirement that a recommended product fits the client's objectives, risk tolerance and circumstances. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Rebalancing | Trading a portfolio back to its target allocation after market moves. |
| Margin call | A demand for more collateral when exposure rises or collateral value falls. |
| Corporate action | An event initiated by an issuer, such as a dividend, split or merger, that affects security holders. |
| Tax lot | A purchase of a security with its own date and cost basis, which determines the tax when sold. |
| Persistency | The share of policies that stay in force over time; lapse is its opposite. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| ASR | Automatic speech recognition: converting audio of calls into text. |
| Obligation register | A list of regulatory requirements mapped to the policies and controls that satisfy them. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
