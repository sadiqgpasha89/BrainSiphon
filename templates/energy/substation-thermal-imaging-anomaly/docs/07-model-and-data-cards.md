# Substation Thermal Imaging Anomaly Detection: model card and data card

> Generated from the blueprint `energy/substation-thermal-imaging-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Substation Thermal Imaging Anomaly Detection · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A fixed temperature-rise threshold per component type, because standards define it.
- **Production model:** A detector with load and ambient normalisation that compares similar phases and ranks hot spots by load-adjusted severity with a technician confirmation step.
- **Intended use:** Find hot spots on connectors, breakers and transformers in thermal images and fixed camera feeds, rank them by temperature rise and load, and schedule repairs.
- **Out of scope:** - Camera model: an identifier.<br>- Operator name: irrelevant.<br>- Image file name: an artefact.
- **Primary metrics:** - Recall of confirmed hot spots<br>- False alarms per scan<br>- Severity rank accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Feeder, region and voltage level<br>- Weather regime and season<br>- Asset age, vendor and customer segment<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Reflection<br>- Low load scan<br>- Camera drift
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare fault types, new feeder configurations, extreme weather events and newly connected distributed generation; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Find hot spots on connectors, breakers and transformers in thermal images and fixed camera feeds, rank them by temperature rise and load, and schedule repairs.
- **Label:** For "Substation Thermal Imaging Anomaly Detection": Find hot spots on connectors, breakers and transformers in thermal images and fixed camera feeds, rank them by temperature rise and load, and schedule repairs. The reference kit's label: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Design around this trap first: Absolute temperature thresholds.
- **Sources:** - **Source:** Temperature difference between phases inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the image.<br>- **Source:** Load at capture time inputs<br>**Owner:** Asset management<br>**System Of Record:** Meter data management and billing (CIS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from SCADA.<br>- **Source:** Ambient and wind inputs<br>**Owner:** Retail and customer operations<br>**System Of Record:** Asset management and GIS<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from weather.<br>- **Source:** Component type and history inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the register.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Absolute temperature thresholds<br>- Ignoring load at capture<br>- Alerts with no ranking
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
