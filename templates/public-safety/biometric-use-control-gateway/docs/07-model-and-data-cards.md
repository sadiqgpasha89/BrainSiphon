# Biometric Use Control Gateway: model card and data card

> Generated from the blueprint `public-safety/biometric-use-control-gateway` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Biometric Use Control Gateway · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Policy documents and annual compliance reviews, because they are the usual controls.
- **Production model:** A policy gateway that classifies requests, blocks identification calls by default, records exceptions with approvals and reports attempts to the oversight board.
- **Intended use:** Enforce the agency policy on biometric tools by blocking face recognition and similar identification in all analytics and agents, logging any attempted use and routing approved exceptions to named legal approvers.
- **Out of scope:** - Developer name: irrelevant.<br>- Request wording: not policy.<br>- Team size: irrelevant.
- **Primary metrics:** - Policy test coverage<br>- Block rate on seeded identification calls<br>- Latency at p99
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Vendor embedded feature<br>- Misclassification<br>- Emergency request
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare incident types, small language communities, rural areas and major events; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Enforce the agency policy on biometric tools by blocking face recognition and similar identification in all analytics and agents, logging any attempted use and routing approved exceptions to named legal approvers.
- **Label:** For "Biometric Use Control Gateway": Enforce the agency policy on biometric tools by blocking face recognition and similar identification in all analytics and agents, logging any attempted use and routing approved exceptions to named legal approvers. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Guidelines only.
- **Sources:** - **Source:** Request type inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the request.<br>- **Source:** Data type inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the catalogue.<br>- **Source:** Approval record inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the policy store.<br>- **Source:** Calling system and purpose inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the request.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Guidelines only<br>- Internal-only scope<br>- No logs of attempts
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
