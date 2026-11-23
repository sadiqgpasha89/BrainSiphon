# Ambulance Posting Optimisation: model card and data card

> Generated from the blueprint `public-safety/ambulance-posting-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ambulance Posting Optimisation · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed post locations by time of day, because they are the standard deployment.
- **Production model:** A dynamic coverage optimiser using forecast demand and live unit positions with a simulation for testing, producing ranked move suggestions with their effect on coverage.
- **Intended use:** Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor.
- **Out of scope:** - Crew name: irrelevant.<br>- Vehicle number: an identifier.<br>- Station nickname: an artefact.
- **Primary metrics:** - Coverage in simulation<br>- Response time at the 90th percentile<br>- Suggestion acceptance
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Major incident<br>- Crew fatigue<br>- Road closure
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor.
- **Label:** For "Ambulance Posting Optimisation": Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Average-time objectives.
- **Sources:** - **Source:** Unit status and location inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from AVL.<br>- **Source:** Demand forecast by zone inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from forecast.<br>- **Source:** Travel time estimates inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from traffic data.<br>- **Source:** Coverage gaps inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: computed.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Average-time objectives<br>- Ignoring crew rules<br>- Raw before-and-after comparisons
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
