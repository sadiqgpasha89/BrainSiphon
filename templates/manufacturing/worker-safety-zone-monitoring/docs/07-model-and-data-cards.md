# Worker Safety Zone Monitoring: model card and data card

> Generated from the blueprint `manufacturing/worker-safety-zone-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Worker Safety Zone Monitoring · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Light curtains and area scanners wired to the safety controller, because they are the certified measure.
- **Production model:** A person-detection model on edge hardware that raises warnings and feeds zone status to the safety system as an advisory input, with anonymised statistics for near-miss analysis.
- **Intended use:** Detect people entering hazardous zones near machines and vehicles and trigger warnings or a safe slow-down through the certified safety system, without identifying individuals.
- **Out of scope:** - Worker identity: privacy risk and no safety value.<br>- Clothing colour alone: weak link.<br>- Shift label alone: irrelevant.
- **Primary metrics:** - Recall of people in the zone at fixed false alarms<br>- Latency<br>- Camera health uptime
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Poor lighting<br>- Forklift loads<br>- Camera blocked
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect people entering hazardous zones near machines and vehicles and trigger warnings or a safe slow-down through the certified safety system, without identifying individuals.
- **Label:** For "Worker Safety Zone Monitoring": Detect people entering hazardous zones near machines and vehicles and trigger warnings or a safe slow-down through the certified safety system, without identifying individuals. The reference kit's label: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Design around this trap first: Replacing certified interlocks.
- **Sources:** - **Source:** Person detection in zone inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: confidence calibrated.<br>- **Source:** Object speed and direction inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from tracking.<br>- **Source:** Zone state inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the controller.<br>- **Source:** Visibility conditions inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the camera.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Replacing certified interlocks<br>- Identifying individuals<br>- Accuracy as the headline metric
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
