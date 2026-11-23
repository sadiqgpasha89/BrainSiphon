# Site Hazard and PPE Detection: model card and data card

> Generated from the blueprint `engineering/site-hazard-ppe-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Site Hazard and PPE Detection · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Safety walks and inspections by safety officers, because they are the standard control.
- **Production model:** A scene-level detection system with edge blurring of people, hazard classes by zone and alerts to safety managers with images and tracked follow-up.
- **Intended use:** Detect scene-level hazards such as missing edge protection, unguarded openings, blocked exits and exclusion zone breaches from site cameras and alert the safety manager, without identifying or scoring individual workers.
- **Out of scope:** - Worker identity: personal data.<br>- Camera brand: weak link.<br>- Clothing colour: weak link.
- **Primary metrics:** - Hazard recall by class<br>- False alert rate<br>- Alert latency
- **Measured values (fill in):** ____________
- **Slices reported:** - Project type, client and region<br>- Discipline and contract type<br>- Site, season and supplier<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Night work<br>- Weather<br>- Temporary structures
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including first-of-a-kind designs, new clients, remote sites and unusual ground conditions; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect scene-level hazards such as missing edge protection, unguarded openings, blocked exits and exclusion zone breaches from site cameras and alert the safety manager, without identifying or scoring individual workers.
- **Label:** For "Site Hazard and PPE Detection": Detect scene-level hazards such as missing edge protection, unguarded openings, blocked exits and exclusion zone breaches from site cameras and alert the safety manager, without identifying or scoring individual workers. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Individual identification.
- **Sources:** - **Source:** Hazard condition classification inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from a vision model.<br>- **Source:** Zone and activity context inputs<br>**Owner:** Project delivery<br>**System Of Record:** Project scheduling and cost control platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the site plan.<br>- **Source:** Equipment proximity inputs<br>**Owner:** Health, safety and quality<br>**System Of Record:** Quality, safety and inspection records<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from telematics.<br>- **Source:** Persistence inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from video.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Individual identification<br>- Equal error costs<br>- Detection as discipline
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
