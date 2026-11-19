# Natural Language to SQL for Analytics: model card and data card

> Generated from the blueprint `saas/natural-language-to-sql` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Natural Language to SQL for Analytics · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** BI dashboard with filters.
- **Production model:** Schema-linked generation over a semantic layer, with validation, cost limits, row-level security and result explanations.
- **Intended use:** Let business users ask questions in plain language and receive correct SQL and results using a governed semantic layer.
- **Out of scope:** - SQL formatting: cosmetic.<br>- Question length: weak.
- **Primary metrics:** - Execution accuracy on golden queries<br>- Wrong-answer rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Ambiguous metric names<br>- Expensive query scans the full warehouse
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
- **Purpose:** Let business users ask questions in plain language and receive correct SQL and results using a governed semantic layer.
- **Label:** For "Natural Language to SQL for Analytics": Let business users ask questions in plain language and receive correct SQL and results using a governed semantic layer. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Benchmark leakage.
- **Sources:** - **Source:** Schema linking accuracy inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: metadata quality.<br>- **Source:** Execution validity and sanity inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: checks.<br>- **Source:** Query cost estimate inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: warehouse.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Benchmark leakage<br>- Golden queries simpler than real
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
