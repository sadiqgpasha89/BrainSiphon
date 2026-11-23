# Caller Location Verification: model card and data card

> Generated from the blueprint `public-safety/caller-location-verification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Caller Location Verification · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** The device location shown on a map and the call taker's verbal check, because it is the standard process.
- **Production model:** A fusion ranker over device fixes, geocoded addresses and landmark matches with an uncertainty radius, shown on the call taker's map with conflict warnings.
- **Intended use:** Combine spoken addresses, device location and map data to propose the most likely incident location for the call taker to confirm, and flag conflicts between sources.
- **Out of scope:** - Caller name: personal data.<br>- Carrier name: weak link.<br>- Phone model: irrelevant.
- **Primary metrics:** - Rank accuracy against confirmed locations<br>- Median error in metres<br>- Conflict flag precision
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Rural address<br>- High-rise caller<br>- Spoofed location
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Combine spoken addresses, device location and map data to propose the most likely incident location for the call taker to confirm, and flag conflicts between sources.
- **Label:** For "Caller Location Verification": Combine spoken addresses, device location and map data to propose the most likely incident location for the call taker to confirm, and flag conflicts between sources. The reference kit's label: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Design around this trap first: Single-pin output.
- **Sources:** - **Source:** Device location accuracy radius inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the carrier.<br>- **Source:** Address text match inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from geocoding.<br>- **Source:** Landmark and road mentions inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from transcripts.<br>- **Source:** Distance between sources inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: computed.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Single-pin output<br>- Retaining location histories<br>- Trusting the first device fix
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
