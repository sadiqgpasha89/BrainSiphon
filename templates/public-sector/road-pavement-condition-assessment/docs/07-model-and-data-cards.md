# Road Pavement Condition Assessment: model card and data card

> Generated from the blueprint `public-sector/road-pavement-condition-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Road Pavement Condition Assessment · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual windshield surveys by engineers, because they are the quality reference.
- **Production model:** A detection and segmentation model with condition indices per segment, a hazard rule, blurred imagery and a treatment optimiser tied to the budget.
- **Intended use:** Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair.
- **Out of scope:** - Vehicle name: irrelevant.<br>- Survey vendor: irrelevant.<br>- File name: an artefact.
- **Primary metrics:** - Condition index error<br>- Hazard recall<br>- Segment ranking accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Wet road<br>- Patches<br>- Poor GPS
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including people with complex or unusual circumstances, small language communities, rural areas and new programme rules; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair.
- **Label:** For "Road Pavement Condition Assessment": Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Raw image storage.
- **Sources:** - **Source:** Crack and pothole detection inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calibrated.<br>- **Source:** Traffic volume and road class inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the register.<br>- **Source:** Surface age and last treatment inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the asset system.<br>- **Source:** Weather exposure inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from weather.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Raw image storage<br>- Damage counts as priority<br>- Image tags as truth
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
