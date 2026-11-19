# In-App AI Copilot for SaaS Products: model card and data card

> Generated from the blueprint `saas/in-app-ai-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** In-App AI Copilot for SaaS Products · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Help articles and static onboarding tours.
- **Production model:** Planner agent over typed product tools with permission-scoped tokens, dry-run previews, confirmations for state changes and cost-aware model routing. User tokens are exchanged (RFC 8693) and passed through the orchestrator to product APIs, and mutations use plan-preview-commit with signed confirmations and idempotency keys.
- **Intended use:** Let users accomplish tasks in the product through natural language, with the copilot calling product APIs safely on their behalf.
- **Out of scope:** - Chat turns: not success.<br>- Response length: weak.
- **Primary metrics:** - Task success on golden tasks<br>- Tool-call validity
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Ambiguous request deletes the wrong object<br>- Tenant data leaks via retrieval<br>- Double click or retry on confirm<br>- Token expires mid-plan
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new and small tenants, rarely used features and non-English users; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Let users accomplish tasks in the product through natural language, with the copilot calling product APIs safely on their behalf.
- **Label:** For "In-App AI Copilot for SaaS Products": Let users accomplish tasks in the product through natural language, with the copilot calling product APIs safely on their behalf. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Golden tasks too easy.
- **Sources:** - **Source:** Tool-call validity rate inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: schemas.<br>- **Source:** Task success rate inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: instrumentation.<br>- **Source:** Confirmation acceptance inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: UI.<br>- **Source:** Plan-hash confirmation match inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: record the hash at preview time, not at execution.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Golden tasks too easy<br>- Ignoring permission edge cases
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
