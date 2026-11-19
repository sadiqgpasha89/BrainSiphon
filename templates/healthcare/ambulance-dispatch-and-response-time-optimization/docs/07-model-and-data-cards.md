# Ambulance Dispatch & Positioning: model card and data card

> Generated from the blueprint `healthcare/ambulance-dispatch-and-response-time-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ambulance Dispatch & Positioning · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Closest-available-unit dispatch.
- **Production model:** Demand forecaster plus approximate dynamic programming for repositioning, and a travel-time-aware assignment optimiser with dispatcher override.
- **Intended use:** Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage.
- **Out of scope:** - Dispatcher ID: personal.<br>- Call centre queue length: operational.
- **Primary metrics:** - Simulated response-time percentiles by priority<br>- Coverage metrics
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Mass-casualty incident<br>- GPS outage
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage.
- **Label:** For "Ambulance Dispatch & Positioning": Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Simulation uses historical calls ignoring policy effects.
- **Sources:** - **Source:** Spatiotemporal demand intensity inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Electronic health record (EHR)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: forecast not actual.<br>- **Source:** Travel-time estimate inputs<br>**Owner:** Hospital data office<br>**System Of Record:** Laboratory, radiology and PACS systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: live feed.<br>- **Source:** Unit availability state inputs<br>**Owner:** Integration team<br>**System Of Record:** Master patient index (MPI)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: real-time.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Simulation uses historical calls ignoring policy effects<br>- Optimising mean rather than tail
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
