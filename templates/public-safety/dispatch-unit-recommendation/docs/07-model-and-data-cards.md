# Dispatch Unit Recommendation: model card and data card

> Generated from the blueprint `public-safety/dispatch-unit-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dispatch Unit Recommendation · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** The closest available unit by straight-line distance or the computer's nearest unit list, because it is the CAD default.
- **Production model:** A scoring service that combines predicted arrival, capability and coverage impact into ranked suggestions with reasons, logging each acceptance or override.
- **Intended use:** Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change.
- **Out of scope:** - Dispatcher name: irrelevant.<br>- Crew name: irrelevant.<br>- Call text wording: not routing.
- **Primary metrics:** - Arrival time error<br>- Capability rule compliance<br>- Agreement with experienced dispatchers
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Stale unit status<br>- Multi-agency incident<br>- Network failure
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
- **Purpose:** Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change.
- **Label:** For "Dispatch Unit Recommendation": Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Automatic assignment.
- **Sources:** - **Source:** Estimated travel time inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the routing engine.<br>- **Source:** Unit capability inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the register.<br>- **Source:** Coverage impact inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the coverage model.<br>- **Source:** Unit status reliability inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from telemetry.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Automatic assignment<br>- Closest-unit-only logic<br>- No reasons shown
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
