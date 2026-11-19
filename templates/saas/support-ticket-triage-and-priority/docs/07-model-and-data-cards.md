# Support Ticket Triage & Priority: model card and data card

> Generated from the blueprint `saas/support-ticket-triage-and-priority` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Support Ticket Triage & Priority · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword rules and manual triage.
- **Production model:** Fine-tuned encoder with account-context features, calibrated urgency, incident linking and skills-based routing.
- **Intended use:** Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA.
- **Out of scope:** - Ticket length: weak.<br>- Customer name: none.
- **Primary metrics:** - Macro-F1 and urgency recall<br>- Routing accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Incident causes a flood of near-identical tickets<br>- New product area with no history
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new and small tenants, rarely used features and non-English users; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA.
- **Label:** For "Support Ticket Triage & Priority": Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Labels from past misrouted tickets.
- **Sources:** - **Source:** Account tier and SLA inputs<br>**Owner:** Product analytics<br>**System Of Record:** Ticketing platform (Zendesk, ServiceNow or Salesforce Service Cloud)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: CRM.<br>- **Source:** Incident linkage inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CRM and customer entitlements (tier, subscription, contractual SLA)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: status.<br>- **Source:** Urgency language inputs<br>**Owner:** Customer success operations<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibration.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Labels from past misrouted tickets<br>- Evaluating without account context
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
