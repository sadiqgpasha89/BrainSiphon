# Cross-Agency Data Sharing Purpose Gateway: model card and data card

> Generated from the blueprint `public-sector/data-sharing-purpose-gateway` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Agency Data Sharing Purpose Gateway · **Domain:** public-sector · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Bilateral agreements and manual approval of each request, because it is the current process.
- **Production model:** A policy gateway evaluating requests against purpose-tagged agreements and consent with field-level minimisation, anomaly detection and a subject-facing access log.
- **Intended use:** Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and why.
- **Out of scope:** - Requester name: irrelevant.<br>- Request wording: not policy.<br>- Agency size: irrelevant.
- **Primary metrics:** - Policy decision correctness on test cases<br>- Minimisation compliance<br>- Latency at p99
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Purpose creep<br>- Consent withdrawal<br>- Emergency request
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including people with complex or unusual circumstances, small language communities, rural areas and new programme rules; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and why.
- **Label:** For "Cross-Agency Data Sharing Purpose Gateway": Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and why. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Prompt-based enforcement.
- **Sources:** - **Source:** Requester and purpose code inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the request.<br>- **Source:** Legal basis and consent state inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the policy store.<br>- **Source:** Field sensitivity class inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the catalogue.<br>- **Source:** Request volume anomaly inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from logs.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Prompt-based enforcement<br>- Whole-record releases<br>- Internal-only logs
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
