# RAG Quality Monitoring in Production: model card and data card

> Generated from the blueprint `saas/rag-quality-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** RAG Quality Monitoring in Production · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Thumbs-up and thumbs-down ratings.
- **Production model:** Sampled online evaluation with retrieval/generation diagnosis, groundedness checks and content-gap reports to doc owners.
- **Intended use:** Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions.
- **Out of scope:** - Answer length: weak.<br>- Latency alone: not quality.
- **Primary metrics:** - Judge-human agreement<br>- Diagnosis accuracy on labelled failures
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Index update lags<br>- Sensitive queries in logs
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
- **Purpose:** Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions.
- **Label:** For "RAG Quality Monitoring in Production": Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Ratings used as quality.
- **Sources:** - **Source:** Retrieval hit rate on judged queries inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: labels.<br>- **Source:** Groundedness rate inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: NLI.<br>- **Source:** Unanswerable-query rate inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: classifier.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Ratings used as quality<br>- Not separating retrieval from generation
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
