# Customer Service Ticket Routing & Draft Replies: data and feature specification

> Generated from the blueprint `retail/customer-service-ticket-routing-and-response` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Service Ticket Routing & Draft Replies · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Customer Service Ticket Routing & Draft Replies": Route tickets to the right queue, detect urgency and draft policy-correct replies so agents resolve contacts faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Measuring CSAT from biased respondents.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Order-state context | status, delivery, refund eligibility | Determines resolution | Fetch live |   |   |   |
| Urgency indicators | repeat contacts, SLA age, sentiment | Priority | Contact graph |   |   |   |
| Policy match | retrieved policy clause for the intent | Correctness | Version control of policies |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Routing | Multi-label intent with order-state context | Text-only classification | Intent depends on the order's state (shipped, delivered) |
| Replies | Policy-grounded drafts with order data | Generic empathetic text | Customers want a resolution not sympathy |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Ticket subject length | no signal |
| Customer greeting style | cosmetic |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Order-state context inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: fetch live. |
| Urgency indicators inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: contact graph. |
| Policy match inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: version control of policies. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: customer_service_ticket_routing_and_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: order_state_context, type: double, nullable: false }
    - { name: urgency_indicators, type: double, nullable: false }
    - { name: policy_match, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Order-state context and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Urgency indicators against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Order-state context, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE customer_service_ticket_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE customer_service_ticket_steps (
  task_id TEXT NOT NULL REFERENCES customer_service_ticket_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE customer_service_ticket_approvals (
  task_id TEXT NOT NULL REFERENCES customer_service_ticket_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Customer Service Ticket Routing & Draft Replies": Route tickets to the right queue, detect urgency and draft policy-correct replies so agents resolve contacts faster. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fulfilment, delivery promises and returns | Orders are routed to warehouses or stores, shipped and sometimes returned. A delivery promise shown at checkout must be one the network can keep; reverse logistics decides whether to resell, refurbish or liquidate a return. | Promising too early causes late deliveries and complaints; promising too late loses conversion, so errors are asymmetric. |
| Intent and the funnel | Shoppers move from browsing to comparing to buying: product views, add-to-cart, checkout and purchase. What is useful changes along the way: alternatives when someone is still choosing, accessories and complements once something is in the cart. | A good next item for a browsing shopper is a bad one for someone about to pay. Decide which stage each placement serves. |
| Bots, crawlers and non-human traffic | Price scrapers, search crawlers and fraud bots click through catalogues quickly and in patterns, sometimes in id order. They often make up a large share of sessions and have no purchase intent. | Counting their clicks creates strong but spurious transitions that outrank real shopper behaviour. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Order-state context | Status, delivery, refund eligibility. Determines resolution. | Leakage risk to design against: Fetch live. |
| A signal-versus-noise trap in this use case: Routing | The true signal is multi-label intent with order-state context; the common noise is text-only classification. | Intent depends on the order's state (shipped, delivered). |

**Ask the experts**

- [ ] What exactly does "Policy-accurate refunds" mean in practice for customer service ticket routing & draft replies: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Order-state context" and "Urgency indicators", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Handle time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: measuring CSAT from biased respondents, and who can confirm the cut-off times and splits?
- [ ] How often does "Refund policy changes mid-week" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Click-and-collect | Ordering online and picking up in store. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| RFM | Recency, frequency and monetary value: three measures used to segment customers. |
| Customer lifetime value (CLV) | The total value a customer is expected to bring over their relationship with the retailer. |
| Dark store | A shop or warehouse used only for fulfilling online orders. |
| Loyalty programme | A scheme that rewards repeat purchases with points or offers. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Context window | The maximum amount of text a model can read at once. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
