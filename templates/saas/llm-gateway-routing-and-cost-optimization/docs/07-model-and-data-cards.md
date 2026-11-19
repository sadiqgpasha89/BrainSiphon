# LLM Gateway Routing & Cost Optimisation: model card and data card

> Generated from the blueprint `saas/llm-gateway-routing-and-cost-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LLM Gateway Routing & Cost Optimisation · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed model per application.
- **Production model:** Router model predicting quality per model, semantic cache with similarity thresholds, budget guards and multi-provider failover.
- **Intended use:** Route each LLM request to the cheapest model that meets quality needs, with caching, rate limiting and fallbacks.
- **Out of scope:** - Prompt length alone: weak.<br>- Team name: none.
- **Primary metrics:** - Cost saved at equal quality on eval sets<br>- Router accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Cache returns an answer for a similar but different question<br>- Provider outage
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Route each LLM request to the cheapest model that meets quality needs, with caching, rate limiting and fallbacks.
- **Label:** For "LLM Gateway Routing & Cost Optimisation": Route each LLM request to the cheapest model that meets quality needs, with caching, rate limiting and fallbacks. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Router trained on judge scores with bias.
- **Sources:** - **Source:** Query difficulty estimate inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: router model.<br>- **Source:** Cache hit probability inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: index.<br>- **Source:** Provider health and latency inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: monitors.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Router trained on judge scores with bias<br>- Cache evaluated on easy repeats
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
