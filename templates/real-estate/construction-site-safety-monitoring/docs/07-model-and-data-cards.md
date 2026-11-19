# Construction Site Safety Monitoring: model card and data card

> Generated from the blueprint `real-estate/construction-site-safety-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Construction Site Safety Monitoring · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Periodic manual inspections, because they are required.
- **Production model:** Detection and tracking with zone logic, persistence rules and supervisor alerts.
- **Intended use:** Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors.
- **Out of scope:** - Camera brand: A hardware attribute that has no effect on hazard.<br>- Worker identity: Personal and not allowed, and the model should not use it.<br>- Time stamp: Hazards occur at any time, so the clock adds no information.
- **Primary metrics:** - Recall of hazards<br>- Precision
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Night<br>- Dust<br>- New PPE colours
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors.
- **Label:** For "Construction Site Safety Monitoring": Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors. The reference kit's label: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Design around this trap first: Staged footage is clean and well lit and overstates accuracy on real, cluttered sites.
- **Sources:** - **Source:** PPE detection inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: occlusion by machinery lowers accuracy, so require confidence over frames.<br>- **Source:** Zone entry inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: camera calibration errors move the polygon, so recalibrate often.<br>- **Source:** Equipment proximity inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: depth from a single camera is imprecise.<br>- **Source:** Event persistence inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: longer persistence delays alerts, so balance with the 5 second limit.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Staged footage is clean and well lit and overstates accuracy on real, cluttered sites<br>- Site differences in layout, PPE and weather mean a test on one site overstates performance elsewhere
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
