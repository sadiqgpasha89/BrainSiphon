# Missing Person Report Completeness and Routing: model card and data card

> Generated from the blueprint `public-safety/missing-person-report-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Missing Person Report Completeness and Routing · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Intake officers using checklists, because it is the standard process.
- **Production model:** A completeness and duplicate-linking assistant that prompts for missing details and routes each case to a team, with no ranking of urgency and a full log.
- **Intended use:** Check missing person reports for missing details, link them to related reports and route them to the right team, with every case treated as urgent by a human who decides the response.
- **Out of scope:** - Person name: personal data.<br>- Reporter name: personal data.<br>- Report channel: weak link.
- **Primary metrics:** - Completeness of key fields<br>- Duplicate matching precision<br>- Time to routing
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Conflicting details<br>- Cross-border case<br>- Sensitive circumstances
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare incident types, small language communities, rural areas and major events; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Check missing person reports for missing details, link them to related reports and route them to the right team, with every case treated as urgent by a human who decides the response.
- **Label:** For "Missing Person Report Completeness and Routing": Check missing person reports for missing details, link them to related reports and route them to the right team, with every case treated as urgent by a human who decides the response. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Predicted risk scores.
- **Sources:** - **Source:** Missing fields inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the form.<br>- **Source:** Duplicate and linked reports inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from matching.<br>- **Source:** Jurisdiction and location inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from GIS.<br>- **Source:** Contact attempts logged inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the case system.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Predicted risk scores<br>- Lowering priority automatically<br>- Wide access
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
