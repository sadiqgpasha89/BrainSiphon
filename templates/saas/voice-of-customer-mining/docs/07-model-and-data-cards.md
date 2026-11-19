# Voice-of-Customer Mining: model card and data card

> Generated from the blueprint `saas/voice-of-customer-mining` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Voice-of-Customer Mining · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual tagging and spreadsheets.
- **Production model:** Embedding-based topic taxonomy with LLM labelling, aspect sentiment and revenue-weighted prioritisation.
- **Intended use:** Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact.
- **Out of scope:** - Text length: weak.<br>- Channel: bias.
- **Primary metrics:** - Topic coherence and labelling accuracy<br>- Sentiment F1
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Taxonomy drift as product changes<br>- One loud customer submits hundreds of tickets
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new and small tenants, rarely used features and non-English users; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact.
- **Label:** For "Voice-of-Customer Mining": Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Mention counts as importance.
- **Sources:** - **Source:** Theme volume trend inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: taxonomy.<br>- **Source:** Revenue-weighted impact inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: CRM join.<br>- **Source:** Sentiment by theme inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: model.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Mention counts as importance<br>- Evaluating topics without human review
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
