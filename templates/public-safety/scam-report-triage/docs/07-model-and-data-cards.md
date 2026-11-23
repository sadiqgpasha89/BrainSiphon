# Scam Report Triage: model card and data card

> Generated from the blueprint `public-safety/scam-report-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Scam Report Triage · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Reports reviewed one by one by analysts, because it is the current process.
- **Production model:** A classifier with indicator extraction and graph clustering, a victim support route with bank liaison for recent losses and an investigator view of campaigns.
- **Intended use:** Cluster and prioritise scam reports from the public by type, amount and links between reports so investigators find campaigns and victims get the right support.
- **Out of scope:** - Victim name: personal data.<br>- Message tone: weak link.<br>- Report length: weak link.
- **Primary metrics:** - Type accuracy<br>- Cluster purity<br>- Time to bank liaison
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Mixed scams<br>- Victim in distress<br>- Duplicate reports
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare incident types, small language communities, rural areas and major events; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Cluster and prioritise scam reports from the public by type, amount and links between reports so investigators find campaigns and victims get the right support.
- **Label:** For "Scam Report Triage": Cluster and prioritise scam reports from the public by type, amount and links between reports so investigators find campaigns and victims get the right support. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Reports in isolation.
- **Sources:** - **Source:** Scam type cues inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from text.<br>- **Source:** Loss amount and recency inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the report.<br>- **Source:** Shared indicators inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from extraction.<br>- **Source:** Payment channel inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the report.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Reports in isolation<br>- Victim-blaming outputs<br>- Full message copies everywhere
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
