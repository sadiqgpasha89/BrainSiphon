# Gift Recommendation Assistant: model card and data card

> Generated from the blueprint `retail/gift-recommendations-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Gift Recommendation Assistant · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Curated gift guides by price.
- **Production model:** Slot-filling dialogue manager with LLM and catalogue retrieval, delivery feasibility filter and diversified suggestions.
- **Intended use:** Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions.
- **Out of scope:** - Chat tone: stylistic only.<br>- Sender browsing history: not the recipient.
- **Primary metrics:** - Slot-filling accuracy<br>- Constraint satisfaction rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Seasonal peak (festival)<br>- Sensitive occasions (bereavement)
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including cold-start users, long-tail sellers and new catalogue items; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions.
- **Label:** For "Gift Recommendation Assistant": Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Evaluating on easy briefs.
- **Sources:** - **Source:** Gift-brief completeness inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: slot extractor accuracy.<br>- **Source:** Deadline feasibility inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: live carrier promises.<br>- **Source:** Recipient interest match inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: self-reported interests.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on easy briefs<br>- Missing deadline constraints in test
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
